
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

export const FileSchema = z.object({
  path: z.string(),
  content: z.string(),
})

export const ChatData = z.object({
  message: z.string(),
  files: z.array(FileSchema).nullable(),
  special_instructions: z.string().nullable(),
});

export type ChatSchema = z.infer<typeof ChatData>;

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
  response: ChatSchema | null | undefined;
  lastResponseId: string;
  error: boolean;
}

export type Conversation = {
  request: string;
  response: ChatResponse;
}