import { z } from "zod";

export type Dir = {
  title: string;
  children: (Dir | Doc)[];
}

export type Doc = {
  title: string;
  content: string;
}

export type File = {
  path: string;
  content: string;
}

export const FileSchema = z.object({
  path: z.string(),
  content: z.string(),
})

export const conversationSchema = z.object({
  message: z.string(),
  files: z.array(FileSchema).nullable(),
  special_instructions: z.string().nullable(),
});
export type Conversation = z.infer<typeof conversationSchema>;

