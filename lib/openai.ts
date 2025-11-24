import { ChatSchema, TestChatSchema } from "../types";
import { Agent, run, MCPServerStdio } from '@openai/agents';
import path from "path";

const SYSTEM_PROMPT = `You are a professional career coach that lives inside my text editor. Use the tools to read the filesystem and answer questions based on those files. If you are unable to find any files, you can say so instead of assuming they exist.
  You can suggest information that would be useful in helping me get hired.

  You have discussions with me and help me create and improve job application materials.

  You will review all the files available to you when we begin our conversation.  If a file changes during our conversation, review it and adjust your recommendations accordingly.

  - Do not sound too formal or robotic.
  - You will never use em dashes.
  - Only produce files that are markdown or html, never ask if I want other file types.
  - Write like a 36 year old professional software engineer applying for jobs.
`

class MyAgent {
  private agent: Agent<unknown, typeof TestChatSchema>;
  private mcpServer: MCPServerStdio;
  projectName: string;

  constructor(projectName: string, folders: string[]) {
    console.log("Initializing MCP server for project:", folders);
    this.projectName = projectName;
    this.mcpServer = this.CreateServer(folders);
    this.agent = this.CreateAgent(this.mcpServer);

    this.mcpServer.connect();
  }

  destroy() {
    console.log("Closing MCP server");
    this.mcpServer.close();
  }

  private CreateAgent(mcpServer: MCPServerStdio): Agent<unknown, typeof TestChatSchema> {
    const result =  new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: SYSTEM_PROMPT,
      outputType: TestChatSchema,
      mcpServers: [mcpServer]
    });
    return result;
  }

  private CreateServer(folders: string[]) {
    const projectDirs = folders;

    const server = new MCPServerStdio({
      name: 'Filesystem MCP Server, via npx',
      fullCommand: `npx -y ${process.env.MCP_SERVER_PATH} ${projectDirs.join(' ')}`,
    });
    server.connect();
    return server
  };

  async run(userQuery: string, previousResponseId: string | null) {
    console.log("Running agent with query:", userQuery);

    try {
      const stream = await run(this.agent, userQuery, { previousResponseId: previousResponseId ? previousResponseId : undefined, stream: true, maxTurns: 20 });
      for await (const event of stream) {
        console.log("Stream event: ", event.type);
        // // these are the raw events from the model
        // if (event.type === 'raw_model_stream_event') {
        //   console.log(`${event.type} %o`, event.data);
        // }
        // // agent updated events
        // if (event.type === 'agent_updated_stream_event') {
        //   console.log(`${event.type} %s`, event.agent.name);
        // }
        // // Agent SDK specific events
        // if (event.type === 'run_item_stream_event') {
        //   console.log(`${event.type} %o`, event.item);
        // }
      }
      return stream;
    } catch (error) {
      throw error;
    }
  }


}

export { MyAgent };