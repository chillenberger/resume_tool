import { getChatLog, initializeAgent, chatStream } from '@/services/chat-service';
import { ChatResponse, Conversation } from '@/types';
import { useEffect, useState, useCallback, useContext, Suspense } from 'react';
import { ChatSessionContext } from '@/components/session';

export default function useChat(projectDirectory: string, folders: string[] | null) {
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatIndex, setChatIndex] = useState<number>(0);
  const [timeLastRequest, setTimeLastRequest] = useState<string>(new Date().toISOString());
  const {sessionValue, updateSession} = useContext(ChatSessionContext);
  const [streamContent, setStreamContent] = useState<string>('');
  const [chatStreamAction, setChatStreamAction] = useState<string | null>(null);
  const [lastUserQuery, setLastUserQuery] = useState<string>('');
  
  useEffect(() => {
    if( folders ) initializeAgent(projectDirectory, folders);
  }, [projectDirectory, folders]) // Re-initialize agent when project directory changes

  const loadChatByProjectName = useCallback((projectName: string) => {
    setIsLoading(true);
    getChatLog(projectName).then(logs => {
      setConversation(logs);
      if ( logs.length > 0 ) {
        setChatIndex(logs.length - 1);
        setResponseId(logs[logs.length -1 ].response.lastResponseId);
      }
    })
    .catch(error => {
      setError("Failed to load chat logs");
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, []);

  const newChat = useCallback(() => {
    setConversation([]);
    setLastUserQuery('');
    setChatStreamAction(null);
    setStreamContent('');
    setResponseId(null);
    setChatIndex(0);
  }, []);

  const chatRequestStream = useCallback(async (userQuery: string, projectName: string, folders: string[]) => {
    setIsLoading(true);
    setStreamContent('');
    setChatStreamAction(null);
    setLastUserQuery(userQuery);

    const formData = new FormData();
    formData.append('userQuery', userQuery)
    formData.append('projectName', projectName);
    formData.append('folders', JSON.stringify(folders));
    formData.append('timeLastRequest', timeLastRequest);
    formData.append('chatSession', sessionValue);
    if( responseId ) {
      formData.append('previousResponseId', responseId);
    }

    setChatStreamAction('Sending Request To AI...');
    
    const chunkQueue = [];
    
    try {
      const response = await fetch('/api/chat-stream-test', {
        method: 'POST',
        body: formData
      });
      
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done && chunkQueue.length === 0) {
          setChatStreamAction("Completed");
          break;
        }

        // Decode the chunk and append to content
        let chunk = decoder.decode(value);

        while ( chunk ) {
          const colonIndex = chunk.indexOf(':');
          if ( colonIndex === -1 ) {
            // Incomplete chunk length, wait for more data
            break;
          }

          const lengthStr = chunk.slice(0, colonIndex);
          const length = parseInt(lengthStr, 10);
          if ( isNaN(length) ) {
            console.error("Invalid chunk length:", lengthStr);
            break;
          }

          if ( chunk.length < colonIndex + 1 + length ) {
            // Incomplete chunk data, wait for more data
            break;
          }

          const completeChunk = chunk.slice(colonIndex + 1, colonIndex + 1 + length);
          chunkQueue.push(completeChunk);

          // Remove processed chunk from the original chunk
          chunk = chunk.slice(colonIndex + 1 + length);
        }

        const parsedChunk = JSON.parse(chunkQueue.shift() || '{}');

        if ( parsedChunk.message_chunk ) { 
          setStreamContent((prev) => prev + parsedChunk.message_chunk);
        } else if ( parsedChunk.using_tool ) {
          setChatStreamAction(parsedChunk.using_tool);
        } else if ( parsedChunk.modelAction ) {
          setChatStreamAction(parsedChunk.modelAction);
        } else if ( parsedChunk.final ) {
          setResponseId(parsedChunk.final.lastResponseId);
          setTimeLastRequest(new Date().toISOString());
          
          setConversation((prevConversation) => {
            const chatResponse: ChatResponse = {
              response: parsedChunk.final.finalOutput,
              lastResponseId: parsedChunk.final.lastResponseId,
              error: false,
            }

            const newConversation: Conversation = {
              request: userQuery,
              response: chatResponse
            };

            setChatIndex(prevConversation.length); // +1 for new entry but -1 for 0 index.
            const nextConversation =  [...prevConversation, newConversation];
            return nextConversation;
          });
        }
      }

      
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [responseId, timeLastRequest, sessionValue]);

  return {
    conversation,
    setConversation,
    responseId,
    setResponseId,
    chatIndex,
    setChatIndex,
    isLoading,
    error,
    loadChatByProjectName,
    newChat,
    chatRequestStream,
    streamContent,
    chatStreamAction,
    lastUserQuery,
  }
}
