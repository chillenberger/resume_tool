'use server'

import path from 'path';
import { Conversation, Doc } from '../types';
import exec from 'child_process';
import fs from 'fs';
import {askChat} from '../lib/openai';
import { getDocs } from '../utils/context';

export type ChatConversationResponse = {
  response: Conversation | null | undefined;
  lastResponseId: string | null | undefined;
  error: boolean;
};

async function generateResume(): Promise<ChatConversationResponse> {
  const resumeDataPath = path.join(process.cwd(), 'public', 'resume_data.json');
  const resumeTemplatePath = path.join(process.cwd(), 'public', 'templates', 'resume_template.html');
  const coverletterTemplatePath = path.join(process.cwd(), 'public', 'templates', 'coverletter_template.html');

  const resumeData = fs.readFileSync(resumeDataPath, 'utf-8');
  const resumeTemplate = fs.readFileSync(resumeTemplatePath, 'utf-8');
  const coverletterTemplate = fs.readFileSync(coverletterTemplatePath, 'utf-8');

  const contextDocs = await getDocs();

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

  // contextDocs.forEach( doc => {file.push({title: doc.title, content: doc.content})})

  // const resp = await askChat("Please create a resume with the provided data", null, file);
  // const conversationData: Conversation | undefined = JSON.parse(resp?.output_text || '{}');

  // return {
  //   response: conversationData,
  //   lastResponseId: resp?.id,
  //   error: false,
  // }

  await new Promise(resolve => setTimeout(resolve, 4000));
  return testResponse;
}

async function chat(formData: FormData): Promise<ChatConversationResponse> {
  const userQuery = formData.get('userQuery') as string;
  const previousResponseId = formData.get('previousResponseId') as string | null;
  const doc = formData.get('doc') as string | null;
  const docJson: Doc | undefined = doc ? JSON.parse(doc) as Doc : undefined;

  // const resp = await askChat(userQuery, previousResponseId, docJson ? [docJson] : []);

  // const conversationData: Conversation | undefined = JSON.parse(resp?.output_text || '{}');

  // return {
  //   response: conversationData,
  //   lastResponseId: resp?.id,
  //   error: false,
  // }

  await new Promise(resolve => setTimeout(resolve, 4000));
  return testResponse;
}

async function htmlToPdf(formData: FormData) {
  const doc = formData.get('doc') as string;
  let docName = formData.get('docName') as string || `document`;

  console.log("htmlToPdf called with docName: ", docName);
  console.log("file: ", doc);

  if ( !doc || !docName ) {
    console.error('No HTML content provided');
    return;
  }

  docName = docName.split('.')[0];

  const timeStamp = Date.now();
  const outputFilePath = path.join(process.cwd(), 'public', 'outputs', `${docName}_${timeStamp}.pdf`);
  const tempFilePath = path.join(process.cwd(), 'public', 'temp', `${docName}_${timeStamp}.html`);

  fs.writeFileSync(tempFilePath, doc);

  const command = `html2pdf ${tempFilePath} --background --output ${outputFilePath}`;

  exec.exec(command, (error, stdout, stderr) => {

    fs.unlinkSync(tempFilePath);
    if (error) {
      console.error(`Error executing command: ${error}`);
      return;
    }
    console.log(`Command output: ${stdout}`);
  });

}

export { generateResume, chat, htmlToPdf };

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
    ]
  },
  lastResponseId: "test-response-id",
  error: false
}