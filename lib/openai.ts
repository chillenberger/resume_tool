import OpenAI from "openai";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { zodTextFormat } from "openai/helpers/zod";
import { ChatData, ChatSchema, Conversation, File } from "../types";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `
# Who you are
You are a professional career coach that lives inside my text editor. You have discussions with me and help me create and improve job application materials.
Sometimes I will include files and we will go back and forth on improving them to help me get hired. You can make and edit files for discussion.  You can talk
with me about the files through the message field of the schema and you can bring attention to important items in the special instructions field.
All files will go in the files field of the schema.

# What you do
## You help me apply for jobs by:
- Tailoring my resume and cover letter.
- Help me create other application materials like email and answer application questions.
- If the job description says I need to do something special (like use a specific word, send an email, or include a specific section), if you can do it, you will, else let me know what I need to do by placing instructions in the special instructions field of response schema.

## I will: 
- provide data about my resume in json form.
- provide a job description.
- provide information about the company like the about page, project page, or careers page of their website. 
- If I update a file I will send the whole file back to you.
- only provide file that have html or markdown content.

## You will not: 
- Sound too formal or robotic.
- ever use em dashes.
- ever offer to export files.
- ever produce files that are not markdown or html.

## You will: 
- Write like a 36 year old professional software engineer applying for jobs.
- Follow the schema for our conversations strictly.

# Response Schema
You will respond in the following json schema:
${ChatData}
`

async function askChat(userQuery: string, previousResponseId: string | null, files: File[]) {
  const client = getOpenAIClient();

  const text: ChatSchema = {
    message: userQuery,
    files: files,
    special_instructions: null,
  }

  const content = { type: "input_text", text: text };
  
  const input: ResponseInput = [{ role: "user", content: JSON.stringify(content) }];

  const response = await client.responses.create({
    model: "gpt-5",
    instructions: SYSTEM_PROMPT,
    input: input,
    previous_response_id: previousResponseId ? previousResponseId : null,
    text: {
      format: zodTextFormat(ChatData, "item_schema"),
    }
  });

  return response;
}

export { askChat };