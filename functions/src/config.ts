import * as functions from 'firebase-functions';

type Config = {
  serviceAccountEmail: string;
  privateKey: string;
  delegatedUser: string;
};

const cached: Partial<Config> = {};

export function getGoogleWorkspaceConfig(): Config {
  if (cached.serviceAccountEmail && cached.privateKey && cached.delegatedUser) {
    return cached as Config;
  }

  const config = functions.config();
  const serviceAccountEmail = config?.google?.service_account_email;
  const privateKey = config?.google?.private_key;
  const delegatedUser = config?.google?.workspace_user;

  if (!serviceAccountEmail || !privateKey || !delegatedUser) {
    throw new Error(
      'Missing Google Workspace configuration. Set google.service_account_email, google.private_key, and google.workspace_user with "firebase functions:config:set".'
    );
  }

  cached.serviceAccountEmail = serviceAccountEmail;
  cached.privateKey = privateKey.replace(/\\n/g, '\n');
  cached.delegatedUser = delegatedUser;

  return cached as Config;
}
