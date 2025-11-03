'use server'

import { writeFileSync, unlinkSync, statSync, createReadStream } from 'fs';
import fs from 'fs';
import path from 'path';
import { Dir, Doc } from '../types';
import { readFile, readdir } from 'fs';
import exec from 'child_process';
import {flattenDir} from '@/lib/file';

const rootDir = path.join(process.cwd(), 'public', 'projects');
const outputRoot = path.join(process.cwd(), 'public', 'outputs');
const tempRoot = path.join(process.cwd(), 'public', 'temp');
const resumeDataRoot = path.join(process.cwd(), 'public', 'resume_data');
const templateRoot = path.join(process.cwd(), 'public', 'templates');

// TODO: ensure no files outside public are ever updated. Security risk.

async function createNewProject(projectName: string) {
  const projectPath = path.join(rootDir, projectName);
  try {
    statSync(projectPath);
    throw new Error(`Project ${projectName} already exists`);
  } catch (error) {
    // Directory does not exist, create it
    fs.mkdirSync(projectPath);
    console.log(`Created new project: ${projectName}`);
  }

  try {
    fs.cpSync(templateRoot, path.join(projectPath, 'templates'), { recursive: true });
    fs.cpSync(resumeDataRoot, path.join(projectPath, 'resume_data'), { recursive: true });
  } catch (error) {
    console.error(`Error copying template files to new project:`, error);
    throw error;
  }
}

async function getDirContents(folder: string): Promise<Dir> {
  return new Promise((resolve, reject) => {
    readdir(path.join(rootDir, folder), (err, files) => {
      if (err) {
        console.error(`Error reading ${folder} directory:`, err);
        return reject(err);
      }

      // Filter out system files and hidden files
      const validFiles = files.filter(file => 
        !file.startsWith('.') && 
        !file.startsWith('~') &&
        file.length > 0
      );

      const root: Dir = { title: folder, children: [] };

      // Create promises for reading each file
      const fileReadPromises = validFiles.map(file => {
        return new Promise<void>((fileResolve, fileReject) => {
          const fullPath = path.join(rootDir, folder, file);
          if( statSync(fullPath).isFile()) {
            readFile(fullPath, (err, data) => {
              if (err) {
                console.error(`Error reading file ${fullPath}:`, err);
                fileReject(err);
              } else {
                root.children.push({ title: file, content: data.toString() });
                fileResolve();
              }
            });
          } else {
            // It's a directory, recurse into it
            getDirContents(path.join(folder, file)).then(subDirs => {
              root.children.push({ title: file, children: subDirs.children });
              fileResolve();
            }).catch(fileReject);
          }
        });
      });

      // Wait for all files to be read before resolving
      Promise.all(fileReadPromises)
        .then(() => {
          resolve(root);
        })
        .catch(reject);
    });
  });
}

async function syncServerToDir(dir: Dir, folder: string) {
  const serverDir = await getDirContents(folder);

  // Delete files that are on server but not in dir
  for ( const serverFile of serverDir.children ) {
    const file = dir.children.find(f => f.title === serverFile.title);
    if ( !file ) {
      await deleteFile(serverFile.title, folder);
    } else if ( 'children' in serverFile && 'children' in file ) {
      await syncServerToDir(file, path.join(folder, file.title));
    }
  }

  // Update or add files from dir to server
  for ( const file of dir.children ) {
    if ( 'content' in file ) {
      await updateFile(file, folder);
    } else if ( 'children' in file ) {
      const subFolder = path.join(folder, file.title);
      try {
        statSync(path.join(rootDir, subFolder));
      } catch (error) {
        // Directory does not exist, create it
        fs.mkdirSync(path.join(rootDir, subFolder));
      }
      await syncServerToDir(file, subFolder);
    }
  }
}

async function updateFile(doc: Doc, folder: string) {
  const filePath = path.join(rootDir, folder, doc.title);
  console.log(`updatingFile at ${filePath} with: ${doc.content}`);
  try {
    writeFileSync(filePath, doc.content, { flag: 'w' });
  } catch (error) {
    console.error(`Error updating file ${doc.title} in ${filePath}:`, error);
  }
}

async function deleteFile(title: string, folder: string) {
  const filePath = path.join(rootDir, folder, title);
  try {
    unlinkSync(filePath);
    console.log(`Successfully deleted ${title}`);
  } catch (error) {
    console.error(`Error deleting file ${title} in ${filePath}:`, error);
  }
}

async function exportHtmlToPdf(formData: FormData) {
  const doc = formData.get('doc') as string;
  let docName = formData.get('docName') as string || `document`;
  
  if ( !doc || !docName ) {
    console.error('No HTML content provided');
    return;
  }

  docName = docName.split('.')[0];

  const timeStamp = Date.now();
  const outputFilePath = path.join(outputRoot, `${docName}.pdf`);
  const tempFilePath = path.join(tempRoot, `${docName}_${timeStamp}.html`);

  const command = `html2pdf ${tempFilePath} --background --output ${outputFilePath}`;
  writeFileSync(tempFilePath, doc);

  exec.exec(command, (error, stdout, stderr) => {

    unlinkSync(tempFilePath);
    if (error) {
      console.error(`Error executing command: ${error}`);
      return;
    }
    console.log(`Command output: ${stdout}`);
  });
}

export { exportHtmlToPdf, deleteFile, getDirContents, syncServerToDir, createNewProject};
