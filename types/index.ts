import { z } from "zod";

export const DocSchema = z.object({
  title: z.string(),
  content: z.string(),
})
export type Doc = z.infer<typeof DocSchema>;

export const conversationSchema = z.object({
  message: z.string(),
  files: z.array(DocSchema).nullable(),
  special_instructions: z.string().nullable(),
});
export type Conversation = z.infer<typeof conversationSchema>;

