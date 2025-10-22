'use server'

import { Conversation, File, ChatResponse, ChatSchema, ChatLog} from '../types';
import { askChat } from '../lib/openai';
import { createChatLog, getChatLogsByProject } from './db-service';

async function chat(formData: FormData): Promise<ChatResponse> {
  const userQuery = formData.get('userQuery') as string;
  const previousResponseId = formData.get('previousResponseId') as string | null;
  const projectName = formData.get('projectName') as string | null;
  const doc = formData.get('doc') as string | null;
  const docJson: File | undefined = doc ? JSON.parse(doc) as File : undefined;

  const resp = await askChat(userQuery, previousResponseId, docJson ? [docJson] : []);

  const conversationData: ChatSchema = JSON.parse(resp?.output_text || '{}');

  const chatLogEntry = {
    user_id: "user-123",
    project_id: projectName || 'default',
    response_id: resp?.id,
    previous_response_id: previousResponseId,
    request_text: userQuery,
    response_text: conversationData.message,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }

  await createChatLog(chatLogEntry);

  return {
    response: conversationData,
    lastResponseId: resp?.id,
    error: false,
  }

  // await new Promise(resolve => setTimeout(resolve, 1000));
  // return testResponse;
}

async function getChatLog(projectName: string): Promise<Conversation[]> {
  const chatLogs: ChatLog[] = await getChatLogsByProject(projectName);
  return chatLogs.map(log => ({
    request: log.request_text || '',
    response: {
      response: {
        message: log.response_text || '',
        files: [],
        special_instructions: ''
      },
      lastResponseId: log.response_id,
      error: false, 
    }
  }));
}

export {chat, getChatLog};

const testResponse = {
  response: {
    message: "This is a test response",
    files: [
      {
        path: "project-1/resume.html",
        content: "<html><body><h1>Test Resume</h1></body></html>"
      },
      {
        path: "project-1/coverletter.html",
        content: "<html><body><h1>Test Cover Letter</h1></body></html>"
      }
    ],
    special_instructions: "These are some special instructions."
  },
  lastResponseId: "test-response-id",
  error: false
}