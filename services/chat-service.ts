'use server'

import path from 'path';
import { Conversation, File} from '../types';
import fs from 'fs';
import {askChat} from '../lib/openai';

export type ChatConversationResponse = {
  response: Conversation | null | undefined;
  lastResponseId: string;
  error: boolean;
};

async function chat(formData: FormData): Promise<ChatConversationResponse> {
  const userQuery = formData.get('userQuery') as string;
  const previousResponseId = formData.get('previousResponseId') as string | null;
  const doc = formData.get('doc') as string | null;
  const docJson: File | undefined = doc ? JSON.parse(doc) as File : undefined;

  console.log("User Query: ", userQuery);
  console.log("Previous Response ID: ", previousResponseId);
  console.log("Doc: ", doc);
  console.log("Doc JSON: ", docJson);

  // const resp = await askChat(userQuery, previousResponseId, docJson ? [docJson] : []);

  // const conversationData: Conversation = JSON.parse(resp?.output_text || '{}');

  // return {
  //   response: conversationData,
  //   lastResponseId: resp?.id,
  //   error: false,
  // }

  await new Promise(resolve => setTimeout(resolve, 1000));
  return testResponse;
}

export {chat };

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