'use client'
import { useEffect, use, useReducer, useCallback } from 'react';
import ChatWindow from '@/components/chat';
import useManageFileState from '@/hooks/use-file-manager';
import WaterAscii from '@/components/water-ascii';
import FileTree from '@/components/file-tree';
import { getContentTypeFromPath } from '@/lib/file';
import Link from 'next/link';

import { DisplayEditor, useTipTapMarkdownEditor } from '@/components/tiptap-editor/tiptap-templates/simple/simple-editor'

import dynamic from 'next/dynamic';
import useCKHtmlEditor from '@/components/ck-editor/ck-editor';

const DisplayCKEditor = dynamic( () => import( '@/components/ck-editor/ck-editor-display' ), { ssr: false } );

type ActiveFileActions = "set" | "updated" | "none";

function activeFileReducer(state: ActiveFileActions, action: 'reset' | 'next') {
  switch(action) {
    case 'reset':
      return "none";
    case 'next':
      if ( state === 'none' ) return 'set';
      if ( state === 'set' ) return 'updated';
      return state;
  }
}

export default function ChatPage({params}: {params: Promise<{ project: string}>}) {
  const {project} = use(params);
  const [activeFileState, activeFileStateDispatch] = useReducer(activeFileReducer, "none");

  const {
    allFiles,
    loadFiles,
    activeFile,
    optimisticEditedFiles,
    setActiveFileContent,
    switchActiveFileTo,
    deleteFile,
    exportFile,
    createFile,
    clearEditedFiles,
  } = useManageFileState(project);

  const markdownEditor = useTipTapMarkdownEditor(() => activeFileStateDispatch('next'));
  const htmlEditor = useCKHtmlEditor(() => activeFileStateDispatch('next'));

  const isLoading = false;

  const extractFileContent = useCallback(() => {
    if (!activeFile) return '';
    const contentType = getContentTypeFromPath(activeFile.path);
    if (contentType === 'markdown') {
      return markdownEditor?.getMarkdown() || '';
    } else {
      return htmlEditor?.editorRef.current?.getData() || '';
    }
  }, [activeFile, markdownEditor, htmlEditor]);

  // Whenever active file changes, load its content into the appropriate editor.
  useEffect(() => {
    const contentType = getContentTypeFromPath(activeFile?.path || '');
    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFile ? activeFile.content : '';
      markdownEditor?.commands.setContent(markdownContent, {contentType: 'markdown'});
    } else if (contentType === 'html' && htmlEditor.editorRef.current) {
      const htmlContent = activeFile ? activeFile.content : '';
      htmlEditor.editorRef.current.setData(htmlContent);
    }
  }, [activeFile, markdownEditor, htmlEditor]);

  const handleSwitchActiveFile = useCallback((path: string) => {
    if ( activeFileState === 'updated' ) {
      const currentContent = extractFileContent();
      setActiveFileContent(currentContent);
    }
    activeFileStateDispatch('reset');
    switchActiveFileTo(path);
  }, [activeFileState, extractFileContent, setActiveFileContent, activeFileStateDispatch, switchActiveFileTo]);

  const handleOnFileDelete = useCallback((path: string) => {
    if ( path === activeFile?.path && activeFileState === 'updated' ) {
      const currentContent = extractFileContent();
      setActiveFileContent(currentContent);
      switchActiveFileTo();
    }
    activeFileStateDispatch('reset');
    deleteFile(path);
  }, [activeFile, activeFileState, extractFileContent, setActiveFileContent, switchActiveFileTo, activeFileStateDispatch, deleteFile]);

  const handleOnFileCreate = useCallback((path: string) => {
    if ( activeFileState === 'updated' ) {
      const currentContent = extractFileContent();
      setActiveFileContent(currentContent);
    }
    activeFileStateDispatch('reset');
    createFile(path, 'New file content');
  }, [activeFileState, extractFileContent, setActiveFileContent, activeFileStateDispatch, createFile]);

  const handleOnFileExport = useCallback((path: string) => {
    if( path === activeFile?.path && activeFileState === 'updated' ) {
      const currentContent = extractFileContent();
      setActiveFileContent(currentContent);
    }
    activeFileStateDispatch('reset');
    exportFile(path);
  }, [activeFile, activeFileState, extractFileContent, setActiveFileContent, activeFileStateDispatch, exportFile]);

  const handleOnChatRequest = useCallback(() => {
    if ( activeFileState === 'updated' ) {
      const currentContent = extractFileContent();
      setActiveFileContent(currentContent);
    }
    activeFileStateDispatch('reset');
  }, [activeFileState, extractFileContent, setActiveFileContent, activeFileStateDispatch]);

  return (
    <div className="flex flex-row m-5">
      <div className="flex flex-col">
        <h1 className="mb-2"><Link href="/">Projects</Link> / {project}</h1>
        <div className="p-2 bg-view-area rounded-md border border-neutral-50/20 me-8 h-[90vh]">
          <div className="flex flex-col gap-3 p-3 w-lg h-full">
            <FileTree dir={allFiles} onFileChange={handleSwitchActiveFile} onFileExport={handleOnFileExport} onFileDelete={handleOnFileDelete} onFileCreate={handleOnFileCreate} />
            <ChatWindow loadDir={loadFiles} project={project} editedFiles={optimisticEditedFiles || {}} clearEditedFiles={clearEditedFiles} onRequest={handleOnChatRequest}/>
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full z-0 flex flex-col">
          <h1 className="mb-2">{activeFile ? activeFile.path : 'Select File / Loading...'}</h1>
          { 
            activeFile ? 
            <div className="flex h-[90vh] overflow-hidden">
              { getContentTypeFromPath(activeFile.path) === 'markdown' ? 
                <DisplayEditor editor={markdownEditor} editorType={'markdown'} /> :  
                <DisplayCKEditor editorRef={htmlEditor} defaultContent={activeFile?.content || ""}/> 
              }
            </div> :
            <WaterAscii className="h-[90vh]"/>
          }
        </div>
      </div>
    </div>
  );
}
