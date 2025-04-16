import { traverse } from '../traverseFiles';
import { Stats } from 'fs';
import type { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');
jest.mock('path');

describe('traverse', () => {
  const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
  const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
  const mockJoin = path.join as jest.MockedFunction<typeof path.join>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoin.mockImplementation((...paths) => paths.join('/'));
  });

  test('应该正确遍历目录', async () => {
    const mockVisitDir = jest.fn();
    const mockVisitFile = jest.fn();
    const rootStats = { isDirectory: () => true, isFile: () => false } as Stats;
    const fileStats = { isDirectory: () => false, isFile: () => true } as Stats;

    mockStat
      .mockResolvedValueOnce(rootStats)
      .mockResolvedValueOnce(fileStats)
      .mockResolvedValueOnce(fileStats);

    const mockDirents = [
      { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
      { name: 'file2.txt', isFile: () => true, isDirectory: () => false }
    ] as Dirent[];

    mockReaddir.mockResolvedValueOnce(mockDirents);
    mockJoin
      .mockReturnValueOnce('/test/file1.txt')
      .mockReturnValueOnce('/test/file2.txt');

    await traverse('/test', mockVisitFile, mockVisitDir);

    expect(mockVisitDir).toHaveBeenCalledTimes(1);
    expect(mockVisitDir).toHaveBeenCalledWith('/test', rootStats);
    expect(mockVisitFile).toHaveBeenCalledTimes(2);
    expect(mockVisitFile).toHaveBeenCalledWith('/test/file1.txt', fileStats);
    expect(mockVisitFile).toHaveBeenCalledWith('/test/file2.txt', fileStats);
  });

  test('应该正确处理包含规则', async () => {
    const mockVisitFile = jest.fn();
    const fileStats = { isDirectory: () => false, isFile: () => true } as Stats;

    mockStat.mockResolvedValueOnce(fileStats);

    await traverse('/test/include.txt', mockVisitFile, undefined, {
      include: '.txt',
      testPath: true
    });

    expect(mockVisitFile).toHaveBeenCalledWith('/test/include.txt', fileStats);
  });
});