'use client'
import React, {useRef, useEffect, useState, use} from 'react';
import { useRouter } from 'next/navigation';
import { getRootPath } from '@/services/file-service';
import PineconeDelicate from '@/components/pinecone-art';

export default function Home() {
  const [rootPath, setRootPath] = useState<string>();
  const filePathRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { 
    getRootPath().then(rootPath => {
      setRootPath(rootPath);
    });
  }, [])
  
  const handleNewPath = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const filePath = filePathRef.current?.value;
    if ( filePath ) {
      const fullFilePath =rootPath + (filePath.startsWith("/") ? filePath.substring(1) : filePath);
      const encodedURI = encodeURIComponent(fullFilePath)
      const uri = "/chat" + "?filePath=" + encodedURI;
      router.push(uri)
    }
  }

  return (
    <div className="flex justify-center flex-col pb-5 h-[100vh]">
      <div className="absolute z-0 top-0 w-full"><PineconeDelicate /></div>
      <div className="flex justify-center flex-col w-[50%] m-auto gap-2 z-1">
        <div className="text-neutral-400">FilePath: {rootPath}</div>
        <UriForm rootPath={rootPath} />
      </div>
    </div>
  );
}

function UriForm ({rootPath}: {rootPath?: string}) {
  const formRef = useRef<HTMLFormElement>(null);
  const filePathRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [inputCount, setInputCount] = useState<number>(1);

  const handleNewPath = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Handling new path submission");
    const uris = [];
    for ( let i = 1; i <= inputCount; i++ ) {
      const filePath = formRef.current?.elements.namedItem('filePath-' + i) as HTMLInputElement;
      console.log("filePath:", filePath.value);
      if ( filePath && filePath.value ) {
        const fullFilePath =rootPath + (filePath.value.startsWith("/") ? filePath.value.substring(1) : filePath.value);
        uris.push(fullFilePath);
      }
      const encodedURI = encodeURIComponent(JSON.stringify(uris));
      const uri = "/chat" + "?filePath=" + encodedURI;
      // console.log("Navigating to:", uri);
      router.push(uri)
    }
    
  }

  const addInputElement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement | null;
    if ( formRef.current && target && target.name === 'filePath-' + inputCount ) {
      const nextInputCount = inputCount + 1;
      setInputCount(nextInputCount);
    } 
  }

  return (
    <form ref={formRef} onSubmit={handleNewPath} className="flex flex-col gap-2 border border-neutral-50/10 rounded-md p-2">
      { Array.from({ length: inputCount }, (_, i) => (
        <input
          key={i}
          type="text"
          name={`filePath-${i + 1}`}
          placeholder="..."
          className="file-input bg-transparent border-0 flex-1"
          onChange={(e) => addInputElement(e)}
        />
      ))}
      {inputCount > 1 &&<button type="submit" className="mt-1 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">Launch Chat</button>}
    </form>
  )
}