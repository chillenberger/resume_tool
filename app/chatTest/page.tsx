'use client'
import { useEffect, useCallback, use, useRef, useState, Dispatch, SetStateAction, useContext } from 'react';
import ChatWindow from '@/components/chat';
import {useManageFiles, useManageActiveFileTest, useVirtualDirectory, ManagedFileSystem} from '@/hooks/use-file-manager';
import PineconeDelicate from '@/components/pinecone-art';
import FileTree from '@/components/file-tree';
import { getContentTypeFromPath, readFileInDir } from '@/lib/file';
import Link from 'next/link';
import path from 'path';
import { 
  exportHtmlToPdf
} from '@/services/file-service';

import { DisplayEditor, useTipTapMarkdownEditor } from '@/components/tiptap-editor/tiptap-templates/simple/simple-editor';
import { useSearchParams } from 'next/navigation';

import dynamic from 'next/dynamic';
import useCKHtmlEditor from '@/components/ck-editor/ck-editor';

import { File } from '@/types';


export default function ChatPage() {
  const [dirsPaths, setDirsPaths] = useState<string[]>(['/Users/danielillenberger/Documents/job_hunting_resources/projects/test', '/Users/danielillenberger/Documents/job_hunting_resources/projects/test-2']);
  const [projectDirs, setProjectDirs] = useState<ManagedFileSystem[]>([]);

  const [activeFile, setActiveFile] = useState<File | null>(null);
  const activeFileState = useRef<'none' | 'set' | 'updated'>('none');

  const [activeDir, setActiveDir] = useState<ManagedFileSystem | null>(null);

  function update(content: string | (() => string)) {
    let nextActiveFileState = activeFile;
    if ( activeFileState.current === 'updated' && activeFile ) {
      const nextContent = typeof content === 'string' ? content : content();
      nextActiveFileState = {path: activeFile.path, content: nextContent};
      setActiveFile(nextActiveFileState);
      activeDir?.updateFile(nextActiveFileState.path, nextActiveFileState.content);
    }
    console.log('Updated Active File: ', nextActiveFileState, activeDir?.dir);
  }

  function test() {
    console.log('projectDirs: ', projectDirs);
  }

  return (
    <div className="flex flex-col m-5 text-stone-300">
      <button onClick={() => {
        const newDirPath = `/Users/danielillenberger/Documents/job_hunting_resources/projects/test-3`;
        setDirsPaths([...dirsPaths, newDirPath]);
      }}>Add Test Dir</button>
      <button onClick={() => test()}>Test Log Dirs</button>
      <button onClick={() => update('test content')}>Update Content</button>

      <div className="flex flex-row mt-5">
        <div className="flex flex-col me-10">
          {dirsPaths.map(dp => (
            <div key={dp} className="me-5">
              <button onClick={() => {
                setDirsPaths(dirsPaths.filter(p => p !== dp));
              }}>Remove {path.basename(dp)}</button>
              <AddDirectory path={dp} setDirs={setProjectDirs} setActiveFile={setActiveFile} setActiveDir={setActiveDir} />
            </div>
          ))}
        </div>
        <div className="flex flex-col ms-10">
          <div>{activeFile?.path || "No File Set"}</div>
          <div>{activeFile?.content || ""  }</div>
        </div>
      </div>

      
    </div>
  );
}

function AddDirectory({path, setDirs, setActiveFile, setActiveDir}: {path: string, setDirs: Dispatch<SetStateAction<ManagedFileSystem[]>>, setActiveFile: Dispatch<SetStateAction<File | null>>, setActiveDir: Dispatch<SetStateAction<ManagedFileSystem | null>>}) {
  const dir = useManageFiles(path);

  useEffect(() => {
    setDirs(prev => {
      const index = prev.findIndex(d => d.dir.title === dir.dir.title);
      if ( index !== -1 ) {
        prev.splice(index, 1);
      }
      return [...prev, dir];
    });
  }, [dir.dir])

  function switch_(path: string) {
    const file = readFileInDir(path, dir.dir)
    setActiveFile(file);
    setActiveDir(dir);
  }

  return <FileTree dir={dir.dir} onFileChange={(path) => switch_(path)} onFileCreate={() => {}}/>; 
}

