
import { Dir, Doc, File, EditorTypes } from '../types';
import path from 'path';
import { writeFileSync, unlinkSync, statSync, createReadStream } from 'fs';
import fs from 'fs';
import { readFile, readdir } from 'fs';
import exec from 'child_process';

function flattenDir(item: Dir | Doc, path: string[] = [], files: File[] = []): File[] {
  if( 'content' in item ) {
    files.push({path: [...path, item.title].join('/'), content: item.content as string})
  } else if ( 'children' in item) {
    path = [...path, item.title];
    for( const child of item.children) {
      const newFiles: File[] = flattenDir(child, path, files)
      files = newFiles;
    }
  }

  return files
}

function expandDir(db: File[]): Dir {
  const firstPath = db[0].path.split("/");
  const rootTitle = firstPath[0];
  if (!rootTitle) throw new Error("Invalid root directory");
  const rootDir: Dir = { title: rootTitle, children: [] };

  for ( const file of db) {
    createFileInDir(file, rootDir);
  }

  return rootDir
}

function findDir(currentPath: string, dir: Dir): Dir | null {
  if (currentPath === "") return null
  
  const splitPath = currentPath.split(path.sep);
  if ( splitPath.shift() !== dir.title) return null;

  // let item: Dir | Doc | undefined;
  while( splitPath.length > 0 ) {
    const subpath = splitPath.shift();
    const item = dir.children.find(c => c.title === subpath && 'children' in c ) as Dir;
    if ( !item || 'content' in item ) return null
    dir = item;
  }

  return dir && 'children' in dir ? dir : null;
}

function readFileInDir(fullPath: string, rootDir: Dir): File | null {
  const fileName = path.basename(fullPath);
  const dirName = path.dirname(fullPath);

  const dir = !!fileName ? findDir(dirName, rootDir) : null;
  const doc = !!dir ? dir.children.find(c => c.title === fileName && 'content' in c) as Doc | undefined : null;

  return doc ? {path: fullPath, content: doc.content} : null;
}

function createFileInDir(file: File, dir: Dir) {
  let dirName = path.dirname(file.path);
  let docTitle = path.basename(file.path);
  
  const splitPath = dirName.split(path.sep).filter(part => part !== "");
  let subPath = splitPath.shift();

  if ( subPath !== dir.title) return;
  subPath = splitPath.shift();
  
  while ( splitPath.length >= 0 && !!subPath ) {
    let nextItem = dir.children.find((item) => item.title === subPath);
    if ( !nextItem ) {
      const newDir: Dir = { title: subPath, children: [] };
      dir.children.push(newDir);
      nextItem = newDir;
    }

    if ( 'content' in nextItem ) throw new Error(`Path ${path} not found, ${subPath} is a file`);
    dir = nextItem;
    subPath = splitPath.shift();
  }

  dir.children.push({title: docTitle, content: file.content});
}

function updateFileInDir(file: File, dir: Dir) {
  deleteFileFromDir(file.path, dir);
  createFileInDir(file, dir);
}

function deleteFileFromDir(rootPath: string, rootDir: Dir) {
  const fileName = path.basename(rootPath);
  const dirName = path.dirname(rootPath);

  if (!fileName) return false;

  const dir = findDir(dirName, rootDir);
  
  if (!dir) return false;

  const fileIndex = dir.children.findIndex(c => c.title === fileName && 'content' in c);
  if (fileIndex === -1) return false;

  dir.children.splice(fileIndex, 1);
  return true;
}

function getContentTypeFromPath(filePath: string): EditorTypes {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.markdown' || ext === '.txt' || ext === '.json') {
    return 'markdown';
  }
  return 'html';
}

export{ flattenDir, expandDir, findDir, readFileInDir, createFileInDir, updateFileInDir, deleteFileFromDir, getContentTypeFromPath }