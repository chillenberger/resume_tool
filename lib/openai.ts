import OpenAI from "openai";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { zodTextFormat } from "openai/helpers/zod";
import { conversationSchema, Conversation, File } from "../types";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `
You are a professional career coach that helps me tailor my resume to a provided job description using my provided resume json data.
When you fill out my resume and cover letter, you will not sound too formal or robotic. You will sound like a human.

If the job description is not provided, you will ask for it.
If the job description says I need to do something special (like use a specific word, send an email, or include a specific section), if you can do it, you will, else let me know what I need to do by placing instructions in the special instructions field of response schema.

I will sometimes include extra information about the company, like their mission statement or values.

Your messages are clear and direct.

never use m dashes. 

We will use the following schema for our conversations:
${conversationSchema}
`

async function askChat(userQuery: string, previousResponseId: string | null, files: File[]) {
  const client = getOpenAIClient();

  const text: Conversation = {
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
      format: zodTextFormat(conversationSchema, "item_schema"),
    }
  });

  return response;
}

export { askChat };