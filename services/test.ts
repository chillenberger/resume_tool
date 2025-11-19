import {describe, expect, test} from '@jest/globals';
import { getFileSystemTest, setFileSystemTest, deleteFileTest } from "@/services/file-service";
import { flattenDir, createFileInDir } from '@/lib/file';
import path from 'path';

describe('test file class', () => {
  test('import dir', async () => {
    const fullPath = path.join(process.cwd(), "test-utils", "test-dir");
    const dir = await getFileSystemTest(fullPath);
    expect(flattenDir(dir)).toEqual(TestDir);
  })
})

describe('test we can set the file system', () => {
  test("simple add file", async () => {
    const rootPath = path.join(process.cwd(), "test-utils", "test-dir");
    let currentDir = await getFileSystemTest(rootPath);
    let newFile = {path: "test-dir/added-file.md", content: 'new test content'};
    createFileInDir(newFile, currentDir);
    console.log("test: ", rootPath, flattenDir(currentDir));
    await setFileSystemTest(currentDir, rootPath);
    let newDir = await getFileSystemTest(rootPath);
    const found = flattenDir(newDir).find(f => f.path === 'test-dir/added-file.md')

    await deleteFileTest(path.basename(newFile.path), rootPath);
    expect(found).toBeTruthy();
  })
})


const TestDir =     [
  {
    path: path.join("test-dir", 'test.md'),
    content: 'test content'
  },
  {
    path: path.join("test-dir", 'test-dir-inner', 'test.md'),
    content: 'test content'
  }
]