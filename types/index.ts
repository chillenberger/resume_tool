
import { z } from "zod";

export type Dir = {
  title: string;
  children: (Dir | Doc)[];
}

export type Doc = {
  title: string;
  content: string;
}

export type File = {
  path: string;
  content: string;
}

export type FileAction = 'created' | 'updated' | 'deleted';

export type FileActionTrack = {
  path: string;
  action: FileAction;
}

export const FileActionsTrackSchema = z.object({
  path: z.string().describe('The path to the file.'),
  action: z.enum(['created', 'updated', 'deleted']).describe('The type of file action.')
});

export const FileSchema = z.object({
  path: z.string(),
  content: z.string(),
})

export const ChatSchema = z.object({
  message: z.string().describe('The is information about the response and actions taken.'),
  special_instructions: z.nullable(z.string()).describe('Any special instructions related to the response. Do not feel obligated to fill this out.'),
  file_actions: z.array(FileActionsTrackSchema).describe('The file actions that you took.'),
});

export type ChatExchange = z.infer<typeof ChatSchema>;

export interface ChatLog {
  id?: number;
  user_id: string;
  project_id: string;
  response_id: string;
  previous_response_id: string | null;
  request_text?: string;
  response_text?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ChatResponse = {
  response: ChatExchange;
  lastResponseId: string;
  error: boolean;
}

export type Conversation = {
  request: string;
  response: ChatResponse;
}

export const ChatActions = z.object({
  action_type: z.enum(['Edited File', 'Created File', 'Deleted File']).describe('The type of system action taken.'),
  details: z.any().describe('Additional details about the action taken.'),
})

export const TestChatSchema = z.object({
  message: z.string().describe('The is information about the response and actions taken.'),
  special_instructions: z.nullable(z.string()).describe('Any special instructions related to the response. Do not feel obligated to fill this out.'),
  system_actions: z.array(ChatActions).describe('The actions you took.'),
});

export type EditorTypes = 'markdown' | 'html';