import OpenAI from "openai";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { zodTextFormat } from "openai/helpers/zod";
import { conversationSchema, Conversation, Doc } from "../types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are a professional career coach that helps me tailor my resume to a provided job description using my provided resume json data.

I will sometimes include extra information about the company, like their mission statement or values.

Your responses are clear and direct.

We will use the following schema for our conversations:
${conversationSchema}
`

async function askChat(userQuery: string, previousResponseId: string | null, files: Doc[]) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const text: Conversation = {
    message: userQuery,
    files: files,
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