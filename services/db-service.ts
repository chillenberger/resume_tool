import { ChatLog } from '@/types/index';
import pool from '@/lib/db';

export async function createChatLog(entry: ChatLog) {
  const query = {
    text: 'INSERT INTO chat_logs (user_id, project_id, response_id, previous_response_id, request_text, response_text, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    values: [entry.user_id, entry.project_id, entry.response_id, entry.previous_response_id, entry.request_text, entry.response_text, entry.created_at],
  };
  await pool.query(query);
}

export async function getChatLogsByProject(projectId: string): Promise<ChatLog[]> {
  const query = {
    text: 'SELECT * FROM chat_logs WHERE project_id = $1 ORDER BY created_at ASC',
    values: [projectId],
  };
  const res = await pool.query(query);
  return res.rows;
}

export async function deleteChatLog(id: number) {
  const query = {
    text: 'DELETE FROM chat_logs WHERE id = $1',
    values: [id],
  };
  await pool.query(query);
}

export async function createActionLog(entry: { user_id: string; session_id: string; action: string; details: any; }) {
  const query = {
    text: 'INSERT INTO action_logs (user_id, session_id, action_type, details) VALUES ($1, $2, $3, $4)',
    values: [entry.user_id, entry.session_id, entry.action, entry.details],
  };
  await pool.query(query);
}

export async function getActionLogsByProject(projectId: string): Promise<{ action_type: string; details: any; created_at: Date; }[]> {
  const query = {
    text: 'SELECT action_type, details, created_at FROM action_logs WHERE session_id = $1 ORDER BY created_at ASC',
    values: [projectId],
  };
  const res = await pool.query(query);
  return res.rows;
}

export async function getActionLogsBySessionAndCreatedAt(sessionId: string, createdAt: Date): Promise<{ action_type: string; details: any; created_at: Date; }[]> {
  const query = {
    text: 'SELECT action_type, details, created_at FROM action_logs WHERE session_id = $1 AND created_at >= $2 ORDER BY created_at ASC',
    values: [sessionId, createdAt],
  };
  const res = await pool.query(query);
  return res.rows;
}

export async function deleteActionLog(id: number) {
  const query = {
    text: 'DELETE FROM action_logs WHERE id = $1',
    values: [id],
  };
  await pool.query(query);
}

// const test = "INSERT INTO action_logs (user_id, project_id, action_type, details) VALUES ('user123', 'project123', 'test_action', '{"message": "This is a test detail"}');";