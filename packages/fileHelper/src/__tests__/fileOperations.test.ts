import {  transformDocument, batchDelete, batchMove } from '../fileOperations';
import * as fs from 'fs/promises';
import { Stats } from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import { traverse } from '@toolsjs-cli/utils';

jest.mock('fs/promises');
jest.mock('path');
jest.mock('xlsx');
jest.mock('pdf-lib');
jest.mock('@toolsjs-cli/utils');

describe('File Operations', () => {
  const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
  const mockRename = fs.rename as jest.MockedFunction<typeof fs.rename>;
  const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
  const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
  const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
  const mockExtname = path.extname as jest.MockedFunction<typeof path.extname>;
  const mockJoin = path.join as jest.MockedFunction<typeof path.join>;
  const mockDirname = path.dirname as jest.MockedFunction<typeof path.dirname>;
  const mockBasename = path.basename as jest.MockedFunction<typeof path.basename>;
  const mockTraverse = traverse as jest.MockedFunction<typeof traverse>;
  const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;

  const mockPdfDoc = {
    getPages: jest.fn().mockReturnValue([]),
    save: jest.fn().mockResolvedValue(Buffer.from('test'))
  };

  const mockStats = {
    isFile: () => true,
    size: 1024,
    mtime: new Date('2024-01-01')
  } as Stats;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtname.mockImplementation((filepath) => '.txt');
    mockJoin.mockImplementation((...paths) => paths.join('/'));
    mockDirname.mockImplementation((p) => '.');
    mockBasename.mockImplementation((p) => 'test.txt');
    (PDFDocument.load as jest.Mock).mockResolvedValue(mockPdfDoc);
    mockUnlink.mockResolvedValue(undefined);
  });

  describe('transformDocument', () => {
    test('应该处理PDF文件', async () => {
      mockReadFile.mockResolvedValue(Buffer.from('test'));
      mockWriteFile.mockResolvedValue(undefined);

      await transformDocument('test.pdf', '.pdf');

      expect(mockReadFile).toHaveBeenCalledWith('test.pdf');
      expect(PDFDocument.load).toHaveBeenCalled();
      expect(mockPdfDoc.getPages).toHaveBeenCalled();
      expect(mockPdfDoc.save).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('应该处理Excel文件', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };
      (xlsx.readFile as jest.Mock).mockReturnValue(mockWorkbook);
      (xlsx.utils.sheet_to_json as jest.Mock).mockReturnValue([['test']]);

      await transformDocument('test.xlsx', '.xlsx');

      expect(xlsx.readFile).toHaveBeenCalledWith('test.xlsx');
      expect(xlsx.writeFile).toHaveBeenCalled();
    });

    test('不支持的文件类型应该抛出错误', async () => {
      await expect(transformDocument('test.doc', '.doc'))
        .rejects.toThrow('Unsupported file type: .doc');
    });

    test('转换失败时应该抛出错误', async () => {
      mockReadFile.mockRejectedValue(new Error('读取失败'));

      await expect(transformDocument('test.pdf', '.pdf'))
        .rejects.toThrow('读取失败');
    });
  });

  describe('batchDelete', () => {
    test('应该按扩展名删除文件', async () => {
      // 设置 mock 行为
      mockTraverse.mockImplementation(async (_, visitFile) => {
        if (visitFile) {
          await visitFile('test.txt', mockStats);
          await visitFile('test.log', mockStats);
        }
      });

      // 配置路径处理
      (path.extname as jest.Mock).mockImplementation(filepath => {
        return filepath.slice(filepath.lastIndexOf('.'));
      });

      const result = await batchDelete('/test', {
        extensions: ['.txt']
      });

      expect(result.deletedFiles).toHaveLength(1);
      expect(result.deletedFiles).toContain('test.txt');
      expect(result.skippedFiles).toContain('test.log');
    });

    test('应该支持正则匹配删除', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test_123.txt', mockStats);
        await visitFile?.('prod_456.txt', mockStats);
      });

      const result = await batchDelete('/test', {
        patterns: [/test_\d+/]
      });

      expect(result.deletedFiles).toContain('test_123.txt');
      expect(result.skippedFiles).toContain('prod_456.txt');
    });

    test('试运行模式不应实际删除文件', async () => {
      // 配置 mock
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test.txt', mockStats);
      });

      (path.extname as jest.Mock).mockReturnValue('.txt');

      const result = await batchDelete('/test', {
        extensions: ['.txt'],
        dryRun: true
      });

      // 验证结果
      expect(mockUnlink).not.toHaveBeenCalled();
      expect(result.deletedFiles).toHaveLength(0);
      expect(result.skippedFiles).toContain('test.txt');
    });

    test('应该正确处理删除错误', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('error.txt', mockStats);
      });
      mockUnlink.mockRejectedValue(new Error('删除失败'));

      const result = await batchDelete('/test', {
        extensions: ['.txt']
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('error.txt');
      expect(result.errors[0].error.message).toBe('删除失败');
    });

    test('应该支持多条件组合删除', async () => {
      const futureDate = new Date('2024-12-31');
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test.txt', {
          ...mockStats,
          size: 2048
        } as Stats);
      });

      const result = await batchDelete('/test', {
        extensions: ['.txt'],
        minSize: 1000,
        maxSize: 3000,
        olderThan: futureDate
      });

      expect(result.deletedFiles).toContain('test.txt');
    });

    test('空规则默认删除所有文件', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test.txt', mockStats);
      });

      const result = await batchDelete('/test', {});

      expect(result.deletedFiles).toHaveLength(1);
      expect(result.skippedFiles).toHaveLength(0);
    });

    test('特殊字符文件名应该正确处理', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('测试文件.txt', mockStats);
        await visitFile?.('file with spaces.txt', mockStats);
        await visitFile?.('file#with#hash.txt', mockStats);
      });

      const result = await batchDelete('/test', {
        extensions: ['.txt']
      });

      expect(result.deletedFiles).toHaveLength(3);
    });

    test('应该支持多条件组合规则', async () => {
      const testDate = new Date('2024-01-01');
      const testStats = {
        ...mockStats,
        size: 2048,
        mtime: testDate
      } as Stats;

      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('large.txt', { ...testStats, size: 5000 });
        await visitFile?.('small.txt', { ...testStats, size: 100 });
        await visitFile?.('old.txt', { ...testStats, mtime: new Date('2023-01-01') });
      });

      const result = await batchDelete('/test', {
        extensions: ['.txt'],
        minSize: 1000,
        olderThan: new Date('2024-02-01')
      });

      expect(result.deletedFiles).toContain('large.txt');
      expect(result.skippedFiles).toContain('small.txt');
    });

    test('自定义过滤器应该正确工作', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test1.txt', mockStats);
        await visitFile?.('test2.txt', mockStats);
      });

      const result = await batchDelete('/test', {
        customFilter: (filepath) => filepath.includes('test1')
      });

      expect(result.deletedFiles).toContain('test1.txt');
      expect(result.skippedFiles).toContain('test2.txt');
    });

    test('多级目录路径应该正确处理', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('dir1/test.txt', mockStats);
        await visitFile?.('dir1/dir2/test.txt', mockStats);
      });

      const result = await batchDelete('/test', {
        patterns: [/dir1\/.*\.txt/]
      });

      expect(result.deletedFiles).toHaveLength(2);
    });

    test('excludes规则应该正确工作', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('important.txt', mockStats);
        await visitFile?.('delete.txt', mockStats);
      });

      const result = await batchDelete('/test', {
        extensions: ['.txt'],
        excludes: [/important/]
      });

      expect(result.deletedFiles).toContain('delete.txt');
      expect(result.skippedFiles).toContain('important.txt');
    });

    test('大文件处理应该正确', async () => {
      const largeStats = {
        ...mockStats,
        size: 1024 * 1024 * 100 // 100MB
      } as Stats;

      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('large.txt', largeStats);
      });

      const result = await batchDelete('/test', {
        minSize: 1024 * 1024 * 50 // 50MB
      });

      expect(result.deletedFiles).toContain('large.txt');
    });
  });

  describe('batchMove', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock 文件系统操作
      mockMkdir.mockResolvedValue(undefined);
      mockRename.mockResolvedValue(undefined);
      mockAccess.mockRejectedValue(new Error('文件不存在'));

      // Mock 路径处理
      mockDirname.mockImplementation(p => '.');
      mockBasename.mockImplementation(p => p.split('/').pop() || '');
      mockJoin.mockImplementation((...parts) => parts.join('/'));
      (path.extname as jest.Mock).mockImplementation(p => {
        const parts = p.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
      });
    });

    test('基本重命名功能', async () => {
      // 准备测试数据
      const sourcePath = 'test.txt';
      const targetPath = './new_test.txt';
      
      // 配置遍历行为
      mockTraverse.mockImplementation(async (_, visitFile) => {
        if (visitFile) {
          await visitFile(sourcePath, mockStats);
        }
      });

      // 执行测试
      const result = await batchMove('/test', {
        renameRule: (name) => `new_${name}`
      });

      // 验证结果
      expect(mockMkdir).toHaveBeenCalledWith('.', { recursive: true });
      expect(mockRename).toHaveBeenCalledWith(sourcePath, targetPath);
      expect(result.movedFiles).toEqual([
        { from: sourcePath, to: targetPath }
      ]);
    });

    test('按扩展名过滤移动文件', async () => {
      // 配置遍历行为
      mockTraverse.mockImplementation(async (_, visitFile) => {
        if (visitFile) {
          await visitFile('test.txt', mockStats);
          await visitFile('test.log', mockStats);
        }
      });

      const result = await batchMove('/test', {
        extensions: ['.txt'],
        renameRule: (name) => `new_${name}`
      });

      // 验证结果
      expect(mockRename).toHaveBeenCalledTimes(1);
      expect(mockRename).toHaveBeenCalledWith('test.txt', './new_test.txt');
      expect(result.movedFiles).toEqual([
        { from: 'test.txt', to: './new_test.txt' }
      ]);
      expect(result.skippedFiles).toContain('test.log');
    });

    test('处理移动时的错误', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test.txt', mockStats);
      });
      mockRename.mockRejectedValue(new Error('移动失败'));

      const result = await batchMove('/test', {
        renameRule: (name) => `new_${name}`
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toBe('移动失败');
    });

    test('处理目标文件已存在的情况', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test.txt', mockStats);
      });
      mockAccess.mockResolvedValue(undefined);

      const result = await batchMove('/test', {
        renameRule: (name) => `new_${name}`,
        overwrite: false
      });

      expect(result.errors[0].error.message).toContain('目标文件已存在');
    });

    test('支持复杂的重命名规则', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test_001.txt', mockStats);
      });

      const result = await batchMove('/test', {
        renameRule: (name) => {
          const [prefix, num] = name.split('_');
          const newNum = String(Number(num.replace('.txt', '')) + 1).padStart(3, '0');
          return `${prefix}_${newNum}.txt`;
        }
      });

      expect(result.movedFiles[0].to).toBe('./test_002.txt');
    });

    test('支持多条件过滤规则', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('small.txt', { ...mockStats, size: 500 });
        await visitFile?.('large.txt', { ...mockStats, size: 5000 });
      });

      const result = await batchMove('/test', {
        extensions: ['.txt'],
        minSize: 1000,
        renameRule: (name) => `new_${name}`
      });

      expect(result.movedFiles).toHaveLength(1);
      expect(result.movedFiles[0].from).toBe('large.txt');
    });

    test('正确处理特殊字符文件名', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('文件名.txt', mockStats);
        await visitFile?.('file with spaces.txt', mockStats);
      });

      const result = await batchMove('/test', {
        renameRule: (name) => `prefix_${name}`
      });

      expect(mockRename).toHaveBeenCalledTimes(2);
      expect(result.movedFiles).toHaveLength(2);
    });

    test('试运行模式不应移动文件', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        await visitFile?.('test.txt', mockStats);
      });

      const result = await batchMove('/test', {
        renameRule: (name) => `new_${name}`,
        dryRun: true
      });

      expect(mockRename).not.toHaveBeenCalled();
      expect(result.skippedFiles).toContain('test.txt');
    });

    test('复杂重命名规则', async () => {
      mockTraverse.mockImplementation(async (_, visitFile) => {
        if (visitFile) {
          await visitFile('test_001.txt', mockStats);
        }
      });

      const result = await batchMove('/test', {
        renameRule: (name) => {
          const [prefix, num] = name.split('_');
          const newNum = String(Number(num.replace('.txt', '')) + 1).padStart(3, '0');
          return `${prefix}_${newNum}.txt`;
        }
      });

      expect(result.movedFiles).toEqual([
        { from: 'test_001.txt', to: './test_002.txt' }
      ]);
    });
  });
});
