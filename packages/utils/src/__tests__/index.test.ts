import { convertNumber, unixy, sumBy } from '../index';

describe('Utils', () => {
  describe('convertNumber', () => {
    test('应该正确转换百分比', () => {
      expect(convertNumber('50%', 200)).toBe(100);
      expect(convertNumber('75.5%', 200)).toBe(151);
    });

    test('应该正确转换数字', () => {
      expect(convertNumber(100, 200)).toBe(100);
      expect(convertNumber('100', 200)).toBe(100);
    });
  });

  describe('unixy', () => {
    const originalPlatform = process.platform;

    afterAll(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });

    test('在 Windows 上应该转换路径分隔符', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(unixy('C:\\path\\to\\file')).toBe('C:/path/to/file');
    });

    test('在非 Windows 上应该保持原样', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(unixy('/path/to/file')).toBe('/path/to/file');
    });
  });

  describe('sumBy', () => {
    test('应该正确计算数组对象字段的总和', () => {
      const arr = [
        { size: 100 },
        { size: 200 },
        { size: 300 }
      ];
      expect(sumBy(arr, 'size')).toBe(600);
    });

    test('空数组应该返回0', () => {
      expect(sumBy([])).toBe(0);
    });
  });
});