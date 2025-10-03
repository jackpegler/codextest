# Workspace Task Radar

Workspace Task Radar is a Firebase-ready application that aggregates assignments made to you across Google Workspace products (Tasks, Docs comments, Google Chat spaces, and Calendar). It exposes a Firebase Cloud Function that collates the data with Google APIs and a lightweight React dashboard deployed with Firebase Hosting.

## Repository structure

```
├── firebase.json            # Firebase Hosting + Functions configuration
├── .firebaserc              # Placeholder for your Firebase project id
├── functions/               # Firebase Functions source (TypeScript)
│   ├── src/
│   │   ├── providers/       # Connectors for Google Workspace surfaces
│   │   ├── config.ts        # Loads service account configuration
│   │   ├── googleAuth.ts    # Creates a delegated auth client
│   │   ├── index.ts         # HTTPS function entrypoint
│   │   ├── summary.ts       # Task summarisation helpers
│   │   └── tasksAggregator.ts
│   └── package.json         # Functions dependencies
└── web/                     # React single page app served by Firebase Hosting
    ├── src/
    │   ├── App.tsx          # Dashboard UI
    │   ├── main.tsx         # React bootstrap
    │   └── styles.css       # Styling
    └── package.json         # Front-end dependencies
```

## Prerequisites

1. **Firebase CLI** – Install via `npm install -g firebase-tools`.
2. **Node.js 18+** – Both the Firebase functions and Vite front-end target Node 18.
3. **Google Workspace admin access** – You need permission to create a service account and enable domain-wide delegation.
4. **Google Cloud project linked to Firebase.** Create or reuse a Firebase project and link it to the same Google Cloud project.

## Google Workspace configuration

1. **Create a service account** in Google Cloud and enable *domain-wide delegation*.
2. Download the JSON key and capture the following values:
   - `client_email`
   - `private_key`
3. **Authorize the service account scopes** in the Workspace Admin console → *Security → Access and data control → API controls → Domain-wide delegation*. Add a new client using the service account client ID with these scopes:
   - `https://www.googleapis.com/auth/tasks.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/chat.tasks.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
4. Decide which Workspace user the service account should impersonate (this is the default user whose tasks will be fetched when none is provided by the dashboard).

## Firebase environment setup

```bash
# Authenticate with Firebase
firebase login

# Set your Firebase project (replace with your project ID)
firebase use your-firebase-project-id

# Configure secret values for the Cloud Function
firebase functions:config:set \
  google.service_account_email="service-account@project.iam.gserviceaccount.com" \
  google.private_key="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  google.workspace_user="user@your-domain.com"

# (Optional) inspect the stored config
firebase functions:config:get
```

> 💡 The private key must preserve line breaks. Surrounding the value in quotes and replacing newlines with `\n` (as shown above) is the recommended approach.

## Local development

```bash
# Install dependencies
npm install --prefix functions
npm install --prefix web

# Build the web app for local hosting
npm run build --prefix web

# Start the Firebase emulators (Functions + Hosting)
firebase emulators:start --only functions,hosting
```

The Hosting emulator serves the built React UI from `web/dist` and proxies `/api/tasks` to the local Cloud Function.

If you prefer to iterate with the Vite dev server (`npm run dev --prefix web`), set `VITE_API_BASE` in a `.env` file so the front-end knows where to reach the emulator function, for example `VITE_API_BASE=http://localhost:5001/your-firebase-project-id/us-central1`.

## Deployment workflow

```bash
# Build the front-end
npm run build --prefix web

# Deploy both hosting and functions
firebase deploy --only hosting,functions
```

During deployment Firebase uploads the bundled dashboard from `web/dist` and the compiled Cloud Function from `functions/lib`.

## Using the dashboard

1. Visit your Firebase Hosting URL.
2. Provide the email address you want to impersonate (it must be within your Workspace domain and have granted the service account access via domain-wide delegation).
3. Click **Fetch tasks**.
4. The dashboard displays:
   - Total tasks, overdue items, and tasks due within 3 days.
   - A breakdown by source (Tasks, Docs, Chat, Calendar).
   - A detailed list with links back to the originating Workspace surface.
   - Any provider-level errors (for example, if Chat tasks are disabled).

You can also pass `?userEmail=user@your-domain.com` in the URL to pre-load a specific account.

## Extending providers

The connectors live in `functions/src/providers`. Each module returns an array of `WorkspaceTask` objects. To onboard more sources (e.g., Gmail assigned emails or third-party integrations) add a new provider module and include it in `aggregateWorkspaceTasks`.

## Troubleshooting

- **403/insufficient permissions** – Confirm the service account has domain-wide delegation and the necessary scopes.
- **No Chat tasks returned** – The Google Chat Tasks API is rolling out gradually. Ensure the API is enabled and the user has access to space tasks.
- **Docs assignments missing** – The connector parses unresolved comment threads that mention your email. Ensure collaborators used the built-in “Assign” feature so the email address is embedded in the HTML content.
- **Calendar tasks** – These are upcoming events where your attendee status is `needsAction`. Accepting the event marks it complete.

## Security considerations

- Store credentials in Firebase Functions config or Secret Manager – never commit them.
- Restrict who can trigger the Cloud Function via Firebase Hosting access controls or Identity Platform if exposing beyond internal use.
- Consider enabling Firebase App Check if you later build a mobile client.
