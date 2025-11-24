'use client'
import { useEffect, useCallback, useState, Dispatch, SetStateAction, useContext } from 'react';
import ChatWindow from '@/components/chat';
import {useManageFiles, useManageActiveFile, ManageActiveFile, useVirtualDirectory, ManagedFileSystem} from '@/hooks/use-file-manager';
import useLogger from '@/hooks/use-logger';
import PineconeDelicate from '@/components/pinecone-art';
import UriForm from '@/components/forms/uri-form';
import FileTree from '@/components/file-tree';
import { getContentTypeFromPath } from '@/lib/file';
import path from 'path';
import { ChatSessionContext } from '@/components/session';
import { 
  exportHtmlToPdf
} from '@/services/file-service';

import { DisplayEditor, useTipTapMarkdownEditor } from '@/components/tiptap-editor/tiptap-templates/simple/simple-editor';
import { useSearchParams } from 'next/navigation';

import dynamic from 'next/dynamic';
import useCKHtmlEditor from '@/components/ck-editor/ck-editor';
const DisplayCKEditor = dynamic( () => import( '@/components/ck-editor/ck-editor-display' ), { ssr: false } );

import { FileAction } from '@/types';

 
export default function ChatPage() {
  const queryParams = useSearchParams();
  const [dirsPaths, setDirsPaths] = useState<string[]>(JSON.parse(queryParams.get('filePath') || '[]'));
  const [projectDirs, setProjectDirs] = useState<ManagedFileSystem[]>([]);

  const activeFileManager: ManageActiveFile = useManageActiveFile(projectDirs);
  const virtualDir = useVirtualDirectory('Test Project', projectDirs);

  const markdownEditor = useTipTapMarkdownEditor(() => activeFileManager.nextActiveFileState());
  const htmlEditor = useCKHtmlEditor(() => activeFileManager.nextActiveFileState());

  const extractFileContent = useCallback(() => {
    const activeFile = activeFileManager.getFile();
    if (!activeFile) return '';
    const contentType = getContentTypeFromPath(activeFile?.path);
    if (contentType === 'markdown') {
      return markdownEditor?.getMarkdown() || '';
    } else {
      return htmlEditor?.editorRef.current?.getData() || '';
    }
  }, [activeFileManager, markdownEditor, htmlEditor]);

  // Whenever active file changes, load its content into the appropriate editor.
  useEffect(() => {
    const contentType = getContentTypeFromPath(activeFileManager.getFile()?.path || '');
    activeFileManager.resetActiveFileState();

    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFileManager?.getFile()?.content || '';
      markdownEditor?.commands.setContent(markdownContent, {contentType: 'markdown'});
    } else if (contentType === 'html' && htmlEditor?.editorRef.current) {
      const htmlContent = activeFileManager?.getFile()?.content || '';
      htmlEditor?.editorRef.current.setData(htmlContent);
    }
  }, [activeFileManager, markdownEditor, htmlEditor]);

  const handleSwitchActiveFile = useCallback((filePath: string) => {
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    activeFileManager.setFile(filePath);
  }, [extractFileContent, activeFileManager]);

  const handleOnFileDelete = useCallback((filePath: string) => {
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    virtualDir.deleteFile(filePath);
  }, [extractFileContent, activeFileManager]);

  const handleOnFileCreate = useCallback((filePath: string) => {
    virtualDir.addFile(filePath, 'New file content');
  }, [extractFileContent, virtualDir.addFile]);

  const handleOnChatRequest = useCallback(async () => {
    // Update the active file immediately, then flush changes to the server to avoid stale reads
    let editedFiles: { [key: string]: FileAction } | null = null;
    if ( activeFileManager.isEdited() ) {
      const DirEdit = virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      editedFiles = DirEdit.nextEditedFilesState;
      activeFileManager.resetActiveFileState();
    }
    await virtualDir.pushFileSystem();
    return editedFiles ? {nextEditedFilesState: editedFiles} : {nextEditedFilesState: virtualDir.getEditedFiles()};
  }, [extractFileContent, virtualDir.updateFile, virtualDir.pushFileSystem]);

  const handleOnFileExport = useCallback((filePath: string) => {
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    
    const file = virtualDir.getFile(filePath).file;
    if ( !file ) return; 

    const formData = new FormData();
    formData.append('doc', file.content);
    formData.append('docName',path.basename(file.path));

    // if ( folders ) exportHtmlToPdf(formData, folders);
    console.log("TODO: Implement exportHtmlToPdf");
  }, [extractFileContent, virtualDir.getFile]);

  const handleRemoveDir = (path: string) => {
    setDirsPaths(dirsPaths.filter(p => p !== path));
  };

  const handleAddDir = (path: string) => {
    if ( !dirsPaths.includes(path) ) {
      setDirsPaths([...dirsPaths, path]);
    }
  }

  return (
    <div className="flex flex-col m-5 text-stone-300">
      <div className="flex flex-row mt-5">
        <WindowFrame>
          <UriForm handleAddDir={handleAddDir} />
          <div className="flex flex-col me-10">
            {dirsPaths.map(dp => (
              <div key={dp} className="me-5">
                <AddDirectory path={dp} setDirs={setProjectDirs} onSwitchActiveFile={handleSwitchActiveFile} onDeleteFile={handleOnFileDelete} onCreateFile={handleOnFileCreate} handleRemoveDir={() => handleRemoveDir(dp)}/>
              </div>
            ))}
          </div>
        </WindowFrame>
        <WindowFrame className="min-w-[50rem] flex flex-col">
          <div>File: {activeFileManager.getFile() ? activeFileManager.getFile()?.path : 'Select File / Loading...'}</div>
          <div>Directory: {activeFileManager.getDir()?.dir.title || "No Directory Set"}</div>
          <div className="w-full  h-full z-0 flex flex-col">
            { 
              activeFileManager.getFile() ? 
              <div className="flex h-[90vh] overflow-hidden">
                { getContentTypeFromPath(activeFileManager.getFile()?.path || "") === 'markdown' ? 
                  <DisplayEditor editor={markdownEditor} editorType={'markdown'} /> :  
                  <DisplayCKEditor editorHandle={htmlEditor} defaultContent={activeFileManager.getFile()?.content || ""}/> 
                }
              </div> :
              <PineconeDelicate />
            }
          </div>
        </WindowFrame>
        <WindowFrame>
          <ChatWindow loadDir={virtualDir.pullFileSystem} project="test" folders={dirsPaths} clearEditedFiles={virtualDir.clearEditedFiles} onRequest={handleOnChatRequest}/>
        </WindowFrame>
      </div>
    </div>
  );
}

function AddDirectory({path, setDirs, onSwitchActiveFile, onDeleteFile, onCreateFile, handleRemoveDir}: {path: string, setDirs: Dispatch<SetStateAction<ManagedFileSystem[]>>, onSwitchActiveFile: (path: string) => void, onDeleteFile: (path: string) => void, onCreateFile: (path: string) => void, handleRemoveDir: (path: string) => void} ) {
  const dir = useManageFiles(path);
  const logger = useLogger();

  useEffect(() => {
    let exists = false;
    setDirs(prev => {
      const index = prev.findIndex(d => d.dir.title === dir.dir.title);
      if ( index !== -1 ) exists = true;
      if ( index !== -1 ) prev.splice(index, 1); // replace if exists
      return [...prev, dir];
    });
    if ( !exists ) logger.addedDirLog(path);
  }, [dir.dir])

  useEffect(() => {
    return () => {
      logger.removedDirLog(path);
      setDirs(prev => prev.filter(d => d.dir.title !== dir.dir.title) );
    }
  }, [])

  return <FileTree dir={dir.dir} onFileChange={(path) => onSwitchActiveFile(path)} onFileCreate={(path) => onCreateFile(path)} onFileDelete={(path) => onDeleteFile(path)} onRemoveDir={() => handleRemoveDir(path)} />; 
}

function WindowFrame(props: {children: React.ReactNode, className?: string}) {
  return (
    <div className={`${props.className || ''} w-full h-full border-1 border-stone-600 p-2 m-1`}>{props.children}</div>
  )
}