import { 
  faFile, 
  faFileExport,
  faTrash,
  faFileCirclePlus,
  faAdd
} from '@fortawesome/free-solid-svg-icons';
import { Dir, File } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react';
import useUrlScraper from '@/hooks/use-scraper';

interface FileTreeProps {
  dir: Dir;
  path?: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  onFileCreate: (path: string, content: string) => void;
}

export default function FileTree({ 
  dir,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  onFileCreate,
}: FileTreeProps) {
  const [showFileForm, setShowFileForm] = useState(false);
  const { urlToDoc, isLoading: scrapeLoading, error: scrapeError } = useUrlScraper();

  const isLoading = scrapeLoading;

  async function handleCreateFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowFileForm(false);

    const formData = new FormData(event.currentTarget);

    const url = formData.get('url') as string;
    const path = formData.get('path') as string;
    const title = formData.get('title') as string;

    event.currentTarget.reset();

    let newFile: File | undefined;

    if ( url ) {
      newFile = await urlToDoc(path, url);
    }

    newFile = newFile ? newFile : {path: `${path}/${title}`, content: 'Add new content here!'}
    onFileCreate(newFile.path, newFile.content);
  }

  return (
    <>
      <RecurseFileTree
        dir={dir}
        path={dir.title}
        onFileChange={onFileChange}
        onFileExport={onFileExport}
        onFileDelete={onFileDelete}
        onFileSetAsContext={onFileSetAsContext}
        handleCreateFile={handleCreateFile}
      />
      {/* <div className='relative'>
        <button className="hover:cursor-pointer" type="button" disabled={isLoading} aria-label="Add Document" onClick={() => setShowFileForm(!showFileForm)}><FontAwesomeIcon icon={faAdd} /></button>
        <form onSubmit={handleCreateFile} className={`flex flex-col gap-2 absolute top-0 right-0 p-2 z-1 bg-black rounded-sm border-neutral-500/50 border-1 ${showFileForm ? '' : 'hidden'}`}>
          <button type="button" className="hover:cursor-pointer absolute top-2 right-2" onClick={() => setShowFileForm(false)}>X</button>
          <input type="text" name="title" placeholder="File title" required/>
          <input type="url" name="content" placeholder="File Content URL" />
          <button type="submit" className="bg-white rounded-md px-2 py-1 hover:cursor-pointer text-black" disabled={isLoading}>Add Document</button>
        </form>
      </div> */}
    </>
    
  )
}

function RecurseFileTree({
  dir,
  path,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  handleCreateFile,
}: {
  dir: Dir;
  path?: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [showFileForm, setShowFileForm] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="font-semibold relative w-full flex justify-between">
        {dir.title} 
        <button className="hover:cursor-pointer" type="button" aria-label="Add Document" onClick={() => setShowFileForm(!showFileForm)}><FontAwesomeIcon icon={faAdd} /></button>
        <form onSubmit={(e) => {
          setShowFileForm(false); 
          handleCreateFile(e)}
          } className={`flex flex-col gap-2 absolute top-0 right-0 p-2 z-1 bg-black rounded-sm border-neutral-500/50 border-1 ${showFileForm ? '' : 'hidden'}`}>
          <button type="button" className="hover:cursor-pointer absolute top-2 right-2" onClick={() => setShowFileForm(false)}>X</button>
          <input type="text" name="title" placeholder="File Path" required/>
          <input type="url" name="content" placeholder="File Content URL" />
          <input type="hidden" name="path" value={path} />
          <button type="submit" className="bg-white rounded-md px-2 py-1 hover:cursor-pointer text-black">Add Document</button>
        </form>
      </div>
      {dir?.children.length > 0 && dir.children.map((item, key) => 
            {
              const currentPath = path ? path + '/' + item.title : item.title;
            return (
            <div key={key} className="ml-4" attr-data={currentPath}>
              {'content' in item && (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <button className="hover:cursor-pointer" onClick={() => onFileChange(currentPath)} aria-label="change file shown">
                      <FontAwesomeIcon icon={faFile} />
                    </button>
                    <span>{item.title}</span>
                  </div>
                  <div>
                    {onFileExport && (
                      <button onClick={() => onFileExport(currentPath)} className="hover:cursor-pointer">
                        <FontAwesomeIcon icon={faFileExport} />
                      </button>
                    )}
                    {onFileDelete && (
                      <button onClick={() => onFileDelete(currentPath)} className="hover:cursor-pointer">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                    {onFileSetAsContext && (
                      <button onClick={() => onFileSetAsContext(currentPath)} className="hover:cursor-pointer">
                        <FontAwesomeIcon icon={faFileCirclePlus} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {'children' in item && item.children && (
                <RecurseFileTree
                  dir={item}
                  path={currentPath}
                  onFileChange={onFileChange}
                  onFileExport={onFileExport}
                  onFileDelete={onFileDelete}
                  onFileSetAsContext={onFileSetAsContext}
                  handleCreateFile={handleCreateFile}
                />
              )}
            </div>)}
        )}
    </div>
  )
}