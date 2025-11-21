'use client'
import { useEffect, useCallback, use, useRef } from 'react';
import ChatWindow from '@/components/chat';
import {useManageFiles, useManageActiveFile, useVirtualDirectory} from '@/hooks/use-file-manager';
import PineconeDelicate from '@/components/pinecone-art';
import FileTree from '@/components/file-tree';
import { getContentTypeFromPath } from '@/lib/file';
import Link from 'next/link';
import path from 'path';
import { 
  exportHtmlToPdf
} from '@/services/file-service';

import { DisplayEditor, useTipTapMarkdownEditor } from '@/components/tiptap-editor/tiptap-templates/simple/simple-editor';
import { useSearchParams } from 'next/navigation';

import dynamic from 'next/dynamic';
import useCKHtmlEditor from '@/components/ck-editor/ck-editor';

const DisplayCKEditor = dynamic( () => import( '@/components/ck-editor/ck-editor-display' ), { ssr: false } );

export default function ChatPage() {
  const queryParams = useSearchParams();
  const folders: string[] = JSON.parse(queryParams.get('filePath') || '[]');
  const projectDirs = folders.map( f => useManageFiles(f));
  const projectTitle = 'Virtual Directory';
  const {virtualDir: dir, getEditedFiles, addFile, getFile, updateFile, deleteFile, pullFileSystem, pushFileSystem, clearEditedFiles} = useVirtualDirectory(projectTitle, projectDirs);
  const {activeFile, update: updateActiveFile, switch_: switchActiveFile, updateActiveFileState} = useManageActiveFile(dir, getEditedFiles(), updateFile);

  const markdownEditor = useTipTapMarkdownEditor(() => updateActiveFileState('next'));
  const htmlEditor = useCKHtmlEditor(() => updateActiveFileState('next' ));

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
    updateActiveFileState('reset');
    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFile ? activeFile.content : '';
      markdownEditor?.commands.setContent(markdownContent, {contentType: 'markdown'});
    } else if (contentType === 'html' && htmlEditor?.editorRef.current) {
      const htmlContent = activeFile ? activeFile.content : '';
      htmlEditor?.editorRef.current.setData(htmlContent);
    }
  }, [activeFile, markdownEditor, htmlEditor]);

  const handleSwitchActiveFile = useCallback((filePath: string) => {
    updateActiveFile(extractFileContent())
    switchActiveFile(filePath);
  }, [extractFileContent, switchActiveFile]);

  const handleOnFileDelete = useCallback((filePath: string) => {
    updateActiveFile(extractFileContent());
    deleteFile(filePath);
  }, [extractFileContent, deleteFile]);

  const handleOnFileCreate = useCallback((filePath: string) => {
    updateActiveFile(extractFileContent());
    addFile(filePath, 'New file content');
  }, [extractFileContent, addFile]);

  const handleOnFileExport = useCallback((filePath: string) => {
    updateActiveFile(extractFileContent());
    const file = getFile(filePath).file;
    if ( !file ) return; 
    const formData = new FormData();
    formData.append('doc', file.content);
    formData.append('docName',path.basename(file.path));

    // if ( folders ) exportHtmlToPdf(formData, folders);
    console.log("TODO: Implement exportHtmlToPdf");
  }, [extractFileContent, getFile]);

  const handleOnChatRequest = useCallback(async () => {
    // Update the active file immediately, then flush changes to the server to avoid stale reads
    const rsp = updateActiveFile(extractFileContent());
    await pushFileSystem();
    return rsp;
  }, [extractFileContent, updateActiveFile, pushFileSystem]);

  return (
    <div className="flex flex-row m-5 text-stone-300">
      <div className="flex flex-col">
        <h1 className="mb-2"><Link href="/">New Project</Link></h1>
        <div className="p-2 bg-transparent rounded-md border border-neutral-50/10 me-8 h-[90vh]">
          <div className="flex flex-col gap-3 p-3 w-lg h-full">
            <FileTree dir={dir} onFileChange={handleSwitchActiveFile} onFileExport={handleOnFileExport} onFileDelete={handleOnFileDelete} onFileCreate={handleOnFileCreate} />
            <ChatWindow loadDir={pullFileSystem} project="test" folders={folders} clearEditedFiles={clearEditedFiles} onRequest={handleOnChatRequest}/>
          </div>
        </div>
      </div>
      <div className="w-full">
        <div className="w-full  h-full z-0 flex flex-col">
          <h1 className="mb-2">{activeFile ? activeFile.path : 'Select File / Loading...'}</h1>
          { 
            activeFile ? 
            <div className="flex h-[90vh] overflow-hidden">
              { getContentTypeFromPath(activeFile.path) === 'markdown' ? 
                <DisplayEditor editor={markdownEditor} editorType={'markdown'} /> :  
                <DisplayCKEditor editorHandle={htmlEditor} defaultContent={activeFile?.content || ""}/> 
              }
            </div> :
            <PineconeDelicate />
          }
        </div>
      </div>
    </div>
  );
}
