
import useChat from '@/hooks/chat-hook';
import { useEffect, useReducer, useState } from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Doc, File } from '@/types';
import Loader from '@/components/loader';
import { useManageFiles} from '@/hooks/file-manager-hook';
import DirTree from '@/components/directory';
import useUrlScraper from '@/hooks/scraper-hook';
import { flattenDir } from '@/lib/file';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser,
  faAdd,
  faPaperPlane, 
  faRobot,
  faFileCircleXmark,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';

interface ChatWindowProps {
  setActiveDoc: Dispatch<SetStateAction<File | null>>, 
  activeDoc: File | null,
  activeDocUpdated: boolean, 
  setActiveDocUpdated: Dispatch<SetStateAction<boolean>>
  project: string
}

function manageEditedFilesReducer(state: string[] = [], action?: { type: 'add' | 'delete' | 'clear', path: string }) {
  if (!action) {
    return state;
  }
  switch(action.type) {
    case 'add':
      if (!action.path) {
        throw new Error("path must be provided for add action");
      }
      return [...state, action.path];
    case 'delete':
      if (!action.path) {
        throw new Error("path must be provided for delete action");
      }
      const index = state.indexOf(action.path);
      if (index === -1) {
        throw new Error("path not found");
      }
      return state.filter((_, i) => i !== index);
    case 'clear': 
      return []
  }
}

export default function ChatWindow({
    setActiveDoc, 
    activeDoc, 
    activeDocUpdated, 
    setActiveDocUpdated, 
    project
}: ChatWindowProps) {
  const { dir, addFile, getFile, updateFile, isLoading: dirLoading, error: contextFileError, exportFile } = useManageFiles(project);
  const { conversation, chatIndex, setChatIndex, responseId, isLoading: chatLoading, chatRequest, error: chatError, loadChatByProjectName } = useChat();
  const { urlToDoc, isLoading: scrapeLoading, error: scrapeError } = useUrlScraper();
  const [editedFiles, editedFilesDispatch] = useReducer(manageEditedFilesReducer, []);
  const [showFileForm, setShowFileForm] = useState(false);

  const isLoading = chatLoading || dirLoading || scrapeLoading;

  useEffect(() => {
    setActiveDoc(null);
    setActiveDocUpdated(false);
  }, []);

  useEffect(() => {
    console.log('Loading chat for project: ', project);
    loadChatByProjectName(project);
  }, [])

  // Add doc to edited if updated. 
  useEffect(() => {
    if( activeDocUpdated && activeDoc ) {
      editedFilesDispatch({ type: 'add', path: activeDoc.path });
    }
  }, [activeDocUpdated])

  useEffect(() => {
    const lastChatResponseFiles = conversation?.[conversation.length - 1]?.response?.response?.files;
    if ( !lastChatResponseFiles ) return;

    if ( activeDoc ) {
      updateFile(activeDoc.path, activeDoc.content);
      setActiveDocUpdated(false);
    }

    lastChatResponseFiles.forEach(file => {
      const path = file.path.startsWith(project) ? file.path.replace(project, '') : file.path;
      addFile(path, file.content);
    })

    if ( lastChatResponseFiles[0] ) {
      const path = lastChatResponseFiles[0].path.startsWith(project) ? lastChatResponseFiles[0].path.replace(project, '') : lastChatResponseFiles[0].path;
      setActiveDoc({path, content: lastChatResponseFiles[0].content});
    } else if( activeDoc ) {
      setActiveDoc( activeDoc )
    } else {
      setActiveDoc(null);
    }
       
  }, [conversation])

  async function handleNewRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();
    const userRequest = formData.get('userQuery') as string;

    setActiveDocUpdated(false);

    if( activeDoc ) {
      updateFile(activeDoc.path, activeDoc.content);
      setActiveDocUpdated(false);
    }

    let files = editedFiles.map( path => {
      console.log("dir: ", dir);
      console.log("Getting file for path: ", path);
      const doc = getFile(path);
      console.log("Got doc: ", doc);
      const file: File | undefined= doc? {path: path, content: doc.content} : undefined
      return file;
    })

    // if first request add all files as context. 
    if( !responseId ) {
      console.log("dir: ", dir);
      files = flattenDir(dir);
      console.log("All files for first request: ", files);
    }

    editedFilesDispatch({type: 'clear'})
    chatRequest(userRequest, project, files.filter(d => d !== undefined) as File[]);
  }

 function handleChangeFile(path: string) {
    const file = getFile(path);
    if( activeDoc && activeDocUpdated ) {
      updateFile(activeDoc.path, activeDoc.content)
    }

    if( !file ) return;
    setActiveDoc({ path, content: file.content });
    setActiveDocUpdated(false);
  }

  function handleCreateDoc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowFileForm(false);

    const formData = new FormData(event.currentTarget);

    const url = formData.get('url') as string;
    const path = formData.get('path') as string;

    event.currentTarget.reset();

    if( activeDoc && activeDocUpdated ) {
      updateFile(activeDoc.path, activeDoc.content);
    }

    if ( url ) {
      urlToDoc(path, url).then( (file: File | undefined) => {
        if ( file ) {
          updateFile(file.path, file.content);
          addFile(file.path, file.content);
          setActiveDoc({path: file.path, content: file.content});
        }
      });
    } else {
      const newFile = {path, content: 'Add new content here!'}
      addFile(newFile.path, newFile.content);
      setActiveDoc(newFile);
    }

  }

  function handleDeleteDoc(title: string) {
    // if( activeDoc?.title === title ) {
    //   setActiveDoc(null);
    // }
    // contextFileDispatch({ type: 'delete', title });
  }

  function handleExportFile(path: string) {
    if( path === activeDoc?.path && activeDocUpdated ) {
      updateFile(activeDoc.path, activeDoc.content);
      setActiveDocUpdated(false);
    }

    const file = getFile(path);
    if( !file ) {
      console.error("File not found for export: ", path);
      return;
    }

    exportFile(path, file.content);
  }

  return (
      <div className="flex flex-col gap-3 p-3 w-lg h-full">
        <div>
        <DirTree dir={dir} onFileChange={handleChangeFile} onFileExport={handleExportFile}/>
        <div className='relative'>
          <button className="hover:cursor-pointer" type="button" disabled={isLoading} aria-label="Add Document" onClick={() => setShowFileForm(!showFileForm)}><FontAwesomeIcon icon={faAdd} /></button>
          <form onSubmit={handleCreateDoc} className={`flex flex-col gap-2 absolute top-0 right-0 p-2 z-1 bg-black rounded-sm border-neutral-500/50 border-1 ${showFileForm ? '' : 'hidden'}`}>
            <button type="button" className="hover:cursor-pointer absolute top-2 right-2" onClick={() => setShowFileForm(false)}>X</button>
            <input type="text" name="path" placeholder="File Path" required/>
            <input type="url" name="content" placeholder="File Content URL" />
            <button type="submit" className="bg-white rounded-md px-2 py-1 hover:cursor-pointer text-black" disabled={isLoading}>Add Document</button>
          </form>
        </div>
        </div>
        
        <form onSubmit={handleNewRequest} className=" bg-white rounded-lg p-2 relative">
          <textarea name="userQuery" className="chat-input" placeholder="Discuss with ChatGPT"></textarea>
          {responseId && <input type="hidden" name="previousResponseId" value={responseId}/>}
          <div className="absolute top-1 right-1"><button type="submit" className="hover:cursor-pointer" disabled={isLoading}>{isLoading ? <Loader withText={false}/> : <FontAwesomeIcon icon={faPaperPlane} className="text-gray-800"/>}</button></div>
          { editedFiles.map((title, i) => <div key={i} className="text-neutral-800">{title}<button type="button" aria-label="remove doc" onClick={() => editedFilesDispatch({ type: 'delete', path: title })}><FontAwesomeIcon icon={faFileCircleXmark} /></button></div>)}
        </form>
        {(chatError || contextFileError) && <div className="text-red-500">{chatError || contextFileError}</div>}

        <div className="flex flex-row gap-2 justify-center items-center">
          {conversation.map((_, i) => (
            <button key={i} className={`w-2 h-2 bg-neutral-50 rounded-xl hover:bg-neutral-200 hover:w-3 hover:h-3 ${chatIndex === i ? 'bg-neutral-300 w-3 h-3' : ''}`} onClick={() => {setChatIndex(i)}}></button>
          ))}
        </div>
        {conversation.length > 0 &&
          <div className="overflow-y-auto">
            {conversation[chatIndex]?.response?.response?.special_instructions && <div className="border-b-1 border-neutral-50/50 pb-2" ><FontAwesomeIcon icon={faCircleExclamation} />{': '}{conversation[chatIndex]?.response?.response?.special_instructions}</div>}
            <div className="border-b-1 border-neutral-50/50 py-2">
              <FontAwesomeIcon icon={faUser} />{': '}
              {conversation[chatIndex]?.request }
            </div>
            <div className="pt-2">
              <FontAwesomeIcon icon={faRobot} />{': '}
              {conversation[chatIndex]?.response?.error ? <span className="text-red-500">Error processing your request.</span> : <span>{conversation[chatIndex]?.response?.response?.message}</span>}
            </div>
          </div>
        }
      </div>
  )
}