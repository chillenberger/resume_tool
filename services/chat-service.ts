'use server'

import path from 'path';
import { Conversation, Doc } from '../types';
import fs from 'fs';
import {askChat} from '../lib/openai';
import { getFiles } from './file-service';

export type ChatConversationResponse = {
  response: Conversation | null | undefined;
  lastResponseId: string;
  error: boolean;
};

async function generateResume(userRequest: string): Promise<ChatConversationResponse> {
  const resumeDataPath = path.join(process.cwd(), 'public', 'resume_data.json');
  const resumeTemplatePath = path.join(process.cwd(), 'public', 'templates', 'resume_template.html');
  const coverletterTemplatePath = path.join(process.cwd(), 'public', 'templates', 'coverletter_template.html');

  const resumeData = fs.readFileSync(resumeDataPath, 'utf-8');
  const resumeTemplate = fs.readFileSync(resumeTemplatePath, 'utf-8');
  const coverletterTemplate = fs.readFileSync(coverletterTemplatePath, 'utf-8');

  const contextDocs = await getFiles('jobs');

  const file  = [{
    title: "resume_data.json",
    content: resumeData
  }, {
    title: "resume_template.html",
    content: resumeTemplate
  }, {
    title: "coverletter_template.html",
    content: coverletterTemplate
  }]


  contextDocs.forEach( doc => {file.push({title: doc.title, content: doc.content})});

  // const resp = await askChat(userRequest, null, file);
  // const conversationData: Conversation = JSON.parse(resp?.output_text || '{}');

  // return {
  //   response: conversationData,
  //   lastResponseId: resp?.id,
  //   error: false,
  // }

  await new Promise(resolve => setTimeout(resolve, 1000));
  return testResponse;
}

async function chat(formData: FormData): Promise<ChatConversationResponse> {
  const userQuery = formData.get('userQuery') as string;
  const previousResponseId = formData.get('previousResponseId') as string | null;
  const doc = formData.get('doc') as string | null;
  const docJson: Doc | undefined = doc ? JSON.parse(doc) as Doc : undefined; 

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

export { generateResume, chat };

const testResponse = {
  response: {
    message: "This is a test response",
    files: [
      {
        title: "resume.html",
        content: "<html><body><h1>Test Resume</h1></body></html>"
      },
      {
        title: "coverletter.html",
        content: "<html><body><h1>Test Cover Letter</h1></body></html>"
      }
    ],
    special_instructions: "These are some special instructions."
  },
  lastResponseId: "test-response-id",
  error: false
}