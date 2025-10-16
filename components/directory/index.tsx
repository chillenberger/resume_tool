import { 
  faFile, 
  faFileExport,
  faTrash,
  faFileCirclePlus
} from '@fortawesome/free-solid-svg-icons';
import { Dir, Doc } from '../../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface DirTreeProps {
  dir: Dir;
  path?: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
}

export default function DirTree({ 
  dir,
  path,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext 
}: DirTreeProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-semibold">{dir.title}</div>
      {dir?.children.length > 0 && dir.children.map((item, key) => 
          {
            const currentPath = path ? path + '/' + item.title : item.title;
          return (
          <div key={key} className="ml-4">
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
                    <button onClick={() => onFileExport(currentPath)}>
                      <FontAwesomeIcon icon={faFileExport} />
                    </button>
                  )}
                  {onFileDelete && (
                    <button onClick={() => onFileDelete(currentPath)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                  {onFileSetAsContext && (
                    <button onClick={() => onFileSetAsContext(currentPath)}>
                      <FontAwesomeIcon icon={faFileCirclePlus} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {'children' in item && item.children && (
              <DirTree 
                dir={item}
                path={currentPath}
                onFileChange={onFileChange}
                onFileExport={onFileExport}
                onFileDelete={onFileDelete}
                onFileSetAsContext={onFileSetAsContext}
              />
            )}
          </div>)}
      )}
    </div>
  )
}