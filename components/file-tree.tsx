import { 
  faFile, 
  faFileExport,
  faTrash,
  faFileCirclePlus
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface FileTreeProps {
  title: string;
  activeFile: boolean;
  onFileSelect: (title: string) => void;
  onFileExport?: (title: string) => void;
  onFileDelete?: (title: string) => void;
  onFileSetAsContext?: (title: string) => void;
}

export default function FileTree({files}: {files: FileTreeProps[]}) {
  return (
    <div className="flex flex-col gap-1 mb-6">
      {files.length > 0 && 
      files.map(({ title, activeFile, onFileSelect, onFileExport, onFileDelete, onFileSetAsContext }, key) => (
        <div key={key} className={`flex flex-row gap-2 rounded-sm px-2 py-1 ${activeFile ? 'bg-gray-800' : ''}`}>
          <button className="truncate hover:cursor-pointer" onClick={() => onFileSelect(title)}><FontAwesomeIcon icon={faFile}/> {title}</button>
          <div className="flex flex-row gap-2 ms-auto">
            {onFileExport && <button onClick={() => onFileExport(title)} className="hover:cursor-pointer"><FontAwesomeIcon icon={faFileExport} /></button>}
            {onFileDelete && <button onClick={() => onFileDelete(title)} className="hover:cursor-pointer"><FontAwesomeIcon icon={faTrash} /></button>}
            {onFileSetAsContext && <button onClick={() => onFileSetAsContext(title)} className="hover:cursor-pointer"><FontAwesomeIcon icon={faFileCirclePlus} /></button>}
          </div>
        </div>
      ))}
    </div>
  )
}