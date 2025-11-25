'use server'

import { Conversation, ChatResponse, ChatSchema, ChatLog, ChatActions} from '../types';
import { MyAgent } from '../lib/openai';
import { createChatLog, getChatLogsByProject, getActionLogsBySessionAndCreatedAt } from './db-service';

let myAgentInstance: MyAgent | null = null;

function initializeAgent(projectName: string, folders: string[]) {
  console.log('initializing Agent')
  const myAgent = new MyAgent(projectName, folders);
  myAgentInstance = myAgent;
}

async function chatStream(formData: FormData){
  const userQuery = formData.get('userQuery') as string;
  const previousResponseId = formData.get('previousResponseId') as string | null;
  const folders = JSON.parse(formData.get('folders') as string) as string[];
  const chatSessionFromForm = formData.get('chatSession') as string;
  const timeLastRequestFromForm = formData.get('timeLastRequest') as string;

  const myAgent = new MyAgent("test stream", folders);
  myAgentInstance = myAgent;

  const userActionsFromDB = await getActionLogsBySessionAndCreatedAt(chatSessionFromForm, new Date(timeLastRequestFromForm));

  const userActions = userActionsFromDB.map(actionLog => ({
    action_type: actionLog.action_type,
    details: actionLog.details,
  }));

  const query = JSON.stringify({"userQuery": userQuery});

  console.log("Constructed agent query for stream:", query);

  const responseStream = await myAgentInstance.runStream(query, previousResponseId);

  if( !responseStream ) {
    throw new Error("No response stream from agent");
  }
  // responseStream is a ReadableStream<Uint8Array>; wrap it in a Response for streaming to client.
  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}


async function getChatLog(projectName: string): Promise<Conversation[]> {
  const chatLogs: ChatLog[] = await getChatLogsByProject(projectName);
  return chatLogs.map(log => ({
    request: log.request_text || '',
    response: {
      response: {
        message: log.response_text || '',
        system_actions: [] as ChatActions[],
        special_instructions: ''
      },
      lastResponseId: log.response_id,
      error: false, 
    }
  }));
}

export {getChatLog, initializeAgent, chatStream};

const testResponse = {
  response: {
    message: "This is a test response",
    system_actions: [] as ChatActions[],
    special_instructions: "These are some special instructions."
  },
  lastResponseId: "test-response-id",
  error: false
}