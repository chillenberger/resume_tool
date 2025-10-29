'use server'

import { Conversation, FileAction, ChatResponse, ChatSchema, ChatLog, FileActionTrack} from '../types';
import { MyAgent } from '../lib/openai';
import { createChatLog, getChatLogsByProject } from './db-service';

let myAgentInstance: MyAgent | null = null;

function initializeAgent(projectName: string) {
  const myAgent = new MyAgent(projectName);
  myAgentInstance = myAgent;
}

async function chat(formData: FormData): Promise<ChatResponse> {
  const userQuery = formData.get('userQuery') as string;
  const previousResponseId = formData.get('previousResponseId') as string | null;

  const fileActions = formData.get('fileActionsTaken') as string | null;
  const fileActionsJson: {[key: string]: FileAction} = fileActions ? JSON.parse(fileActions) as {[key: string]: FileAction} : {};

  if (!myAgentInstance) throw new Error("Agent not initialized");

  const query = JSON.stringify({"userQuery": userQuery, "fileActionsTaken": fileActionsJson});

  let response = await myAgentInstance.run(query, previousResponseId);
  if( !response?.finalOutput ) {
    throw new Error("No response from agent");
  }

  console.log("Agent response:", response);

  const chatLogEntry = {
    user_id: "user-123",
    project_id: myAgentInstance.projectName,
    response_id: response.lastResponseId || '',
    previous_response_id: previousResponseId,
    request_text: JSON.stringify(query),
    response_text: JSON.stringify(response.finalOutput),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }

  await createChatLog(chatLogEntry);
  return {
    response: response.finalOutput,
    lastResponseId: response.lastResponseId || '',
    error: false,
  }

  // console.log("Chat service called with:", { userQuery, previousResponseId, fileActionsJson });

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
        file_actions: [] as FileActionTrack[],
        special_instructions: ''
      },
      lastResponseId: log.response_id,
      error: false, 
    }
  }));
}

export {chat, getChatLog, initializeAgent};

const testResponse = {
  response: {
    message: "This is a test response",
    file_actions: [{path: "test/file/path", action: "created"}] as FileActionTrack[],
    special_instructions: "These are some special instructions."
  },
  lastResponseId: "test-response-id",
  error: false
}