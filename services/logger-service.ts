'use server';
import { createActionLog } from "./db-service";

export default async function logger(action: string, details: string, sessionId: string) {
  await createActionLog({user_id: 'user123', session_id: sessionId, action: action, details: details}) 
}