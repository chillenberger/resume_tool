import { ChatSchema } from "../types";
import { Agent, run, MCPServerStdio } from '@openai/agents';
import path from "path";

const SYSTEM_PROMPT = `You are a professional career coach that lives inside my text editor. Use the tools to read the filesystem and answer questions based on those files. If you are unable to find any files, you can say so instead of assuming they exist.
  You can suggest information that would be useful in helping me get hired.

  You have discussions with me and help me create and improve job application materials.

  You will review all the files available to you when we begin our conversation.  If a file changes during our conversation, review it and adjust your recommendations accordingly.

  - Do not sound too formal or robotic.
  - Do not ever use em dashes.
  - Only produce files that are markdown or html.
  - Write like a 36 year old professional software engineer applying for jobs.
`

class MyAgent {
  private agent: Agent<unknown, typeof ChatSchema>;
  private mcpServer: MCPServerStdio;
  projectName: string;

  constructor(projectName: string) {
    console.log("Initializing MCP server for project:", projectName);
    this.projectName = projectName;
    this.mcpServer = this.CreateServer();
    this.agent = this.CreateAgent(this.mcpServer);

    this.mcpServer.connect();
  }

  destroy() {
    console.log("Closing MCP server");
    this.mcpServer.close();
  }

  private CreateAgent(mcpServer: MCPServerStdio): Agent<unknown, typeof ChatSchema> {
    const result =  new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: SYSTEM_PROMPT,
      mcpServers: [mcpServer],
      outputType: ChatSchema,
    });
    return result;
  }

  private CreateServer() {
    const projectDir = path.join(process.cwd(), '/public/projects/' + this.projectName);

    return new MCPServerStdio({
      name: 'Filesystem MCP Server, via npx',
      fullCommand: `npx -y @modelcontextprotocol/server-filesystem ${projectDir}`,
    })
  }

  async run(userQuery: string, previousResponseId: string | null) {

    console.log("Running agent with query:", userQuery);

    try {
      return await run(this.agent, userQuery, { previousResponseId: previousResponseId ? previousResponseId : undefined });
    } catch (error) {
      throw error;
    }
  }

  // TODO: move logging from chat service to here. remove user_id from chat log, make table user project id.

}

export { MyAgent };