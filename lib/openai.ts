import { ChatSchema } from "../types";
import { Agent, run, MCPServerStdio, RunStreamEvent } from '@openai/agents';

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
  private agent: Agent;
  private mcpServer: MCPServerStdio | null;
  projectName: string;

  constructor(projectName: string, folders: string[]) {
    console.log("Initializing MCP server for project:", folders);
    this.projectName = projectName;
    this.mcpServer = folders.length > 0 ? this.CreateServer(folders) : null;

    this.agent = this.CreateAgent(this.mcpServer);
    this.mcpServer?.connect();
  }

  destroy() {
    console.log("Closing MCP server");
    this.mcpServer?.close();
  }

  private CreateAgent(mcpServer: MCPServerStdio | null): Agent {
    const result =  new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: SYSTEM_PROMPT,
      mcpServers: mcpServer ? [mcpServer] : []
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
        const rsp = wrapStreamRsp(event);
        if ( rsp ) {
          console.log("Wrapped stream response: ", rsp);
        }
      }
      return stream;
    } catch (error) {
      throw error;
    }
  }

  async runStream(userQuery: string, previousResponseId: string | null) {
    console.log("Running agent with query (stream):", userQuery);

    try {
      const streamedResult = await run(this.agent, userQuery, { previousResponseId: previousResponseId ? previousResponseId : undefined, stream: true, maxTurns: 20 });

      // Convert string chunks to Uint8Array for broader BodyInit compatibility (Node + Edge runtimes).
      const encoder = new TextEncoder();

      async function* makeIterator() {
        for await (const event of streamedResult) {
          const rsp = wrapStreamRsp(event);
          if ( rsp ) yield encoder.encode(rsp.length + ":"+ rsp);
        }

        // Indicate the end of the stream with a special message.
        if ( streamedResult.finalOutput ) {
        const finalRsp = JSON.stringify({final: {lastResponseId: streamedResult.lastResponseId, finalOutput: streamedResult.finalOutput, originalQuery: userQuery}});
          yield encoder.encode(finalRsp.length + ":" + finalRsp);
        }
      }
     
      const byteStream = iteratorToStream(makeIterator());
      return byteStream; 
    } catch (error) {
      throw error;
    }
  }
}

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()
 
      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

function wrapStreamRsp(event: RunStreamEvent) {
  // console.log("Stream event: ", event.type);
  // these are the raw events from the model
  if (event.type === 'raw_model_stream_event') {
    // console.log("** raw model stream event **");
    // console.log("event.data: %o", event.data);
    if ( event.data?.type === 'response_started') return JSON.stringify({modelAction: 'started'});
    if ( event.data?.type === 'response_done') return JSON.stringify({modelAction: 'done'});
    if (event.data?.type === 'output_text_delta' && event.data?.delta) return JSON.stringify({message_chunk: event.data.delta});

    if ( event.data?.type === 'model') {
      if (event.data.event.type === 'response.created') {
        // console.log("*** Created the agent with responseId ", event.data.event.responseId);
      }
      if (event.data.event.type === 'response.output_item.added') {
        return JSON.stringify({using_tool: event.data.event.item.name ?? event.data.event.item.type});
      }
      if (event.data.event.type === 'response.completed') {
        // console.log("*** Completed the agent with responseId ", event.data.event.responseId)
      }
    }
  }
  // agent updated events
  if (event.type === 'agent_updated_stream_event') {
    // console.log("** agent updated stream event **");
    // console.log("event.agent: %o", event.agent);
  }
  // Agent SDK specific events
  if (event.type === 'run_item_stream_event') {
    // console.log("** run item stream event **");
    // console.log("event.item: %o, event.name: %o", event.item, event.name);
    if (event.name === 'message_output_created') {
      // console.log(`Message output created`);
    }
  }
}

export { MyAgent };