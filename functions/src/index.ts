import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';
import { aggregateWorkspaceTasks } from './tasksAggregator';
import { getGoogleWorkspaceConfig } from './config';

admin.initializeApp();

const corsHandler = cors({ origin: true });

export const getWorkspaceTasks = functions.region('us-central1').https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { delegatedUser } = getGoogleWorkspaceConfig();
      const userEmail =
        (typeof req.query.userEmail === 'string' && req.query.userEmail.trim()) ||
        (req.body && typeof req.body.userEmail === 'string' && req.body.userEmail.trim()) ||
        delegatedUser;

      const data = await aggregateWorkspaceTasks(userEmail);
      res.status(200).json({ userEmail, ...data });
    } catch (error) {
      functions.logger.error('Failed to aggregate workspace tasks', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});
