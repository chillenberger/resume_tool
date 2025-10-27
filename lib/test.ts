import { flattenDir, expandDir, findDir, getDirFile, deleteFileFromDir } from "@/lib/file";
import {describe, expect, test} from '@jest/globals';
import {Dir, File} from '@/types/index';
// import path from 'path';

describe('test flattenDir', () => {
  test('make a db from file system', () => {
    const db = flattenDir(TestDir);
    expect(db).toEqual(TestDB);
  })
})

describe('test expandDir', () => {
  test('make a dir from db', () => {
    const dir = expandDir(TestDB);
    if ( dir ) console.log("dir: ", flattenDir(dir));
    expect(dir).toEqual(TestDir);
  })
})

describe('findDir', () => {
  test('find existing dir', () => {
    const dir = findDir('subdir1/subsubdir1', TestDir);
    expect(dir).toEqual({
      title: 'subsubdir1',
      children: [
        { title: 'file3.txt', content: 'This is file 3' }
      ]
    });
  });

  test('return null for non-existing dir', () => {
    const dir = findDir('subdir1/nonexistent', TestDir);
    expect(dir).toBeNull();
  });

  test('return null when path points to a file', () => {
    const dir = findDir('subdir1/file2.txt', TestDir);
    expect(dir).toBeNull();
  });

  test('return root dir for empty path', () => {
    const dir = findDir('', TestDir);
    expect(dir).toEqual(TestDir);
  });
});

describe('getDirFile', () => {
  test('get existing file', () => {
    const file = getDirFile('subdir1/subsubdir1/file3.txt', TestDir);
    expect(file).toEqual({ title: 'file3.txt', content: 'This is file 3' });
  });
});

describe('deleteFileFromDir', () => {
  test('delete existing file', () => {
    const dirCopy: Dir = JSON.parse(JSON.stringify(TestDir));
    let file = getDirFile('subdir1/file2.txt', dirCopy);
    expect(file).toEqual({ title: 'file2.txt', content: 'This is file 2' });
    deleteFileFromDir('subdir1/file2.txt', dirCopy);
    file = getDirFile('subdir1/file2.txt', dirCopy);
    expect(file).toBeNull();
  });
});

const TestDir: Dir = { title: 'root', children: [
  { title: 'file1.txt', content: 'This is file 1' },
  { title: 'subdir1', children: [
    { title: 'file2.txt', content: 'This is file 2' },
    { title: 'subsubdir1', children: [
      { title: 'file3.txt', content: 'This is file 3' }
    ]}
  ]},
  { title: 'subdir2', children: [
    { title: 'file4.txt', content: 'This is file 4' }
  ] }
]};

const TestDB: File[] = [
  {
    content: 'This is file 1',
    path: 'root/file1.txt'
  },
  {
    content: 'This is file 2',
    path: 'root/subdir1/file2.txt'
  },
  {
    content: 'This is file 3',
    path: 'root/subdir1/subsubdir1/file3.txt'
  },
  {
    content: 'This is file 4',
    path: 'root/subdir2/file4.txt'
  }
];