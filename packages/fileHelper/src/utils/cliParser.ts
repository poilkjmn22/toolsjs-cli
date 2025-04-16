export interface SizeFilter {
  minSize?: number;
  maxSize?: number;
}

export const parseSizeFilter = (sizeStr?: string): SizeFilter => {
  if (!sizeStr) return {};
  const match = sizeStr.match(/([<>]?)(\d+)(KB|MB|GB)?/);
  if (!match) throw new Error('无效的大小格式');

  const [_, op, size, unit] = match;
  const multiplier = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
  }[unit] || 1;

  const bytes = Number(size) * multiplier;
  return op === '>' ? { minSize: bytes } : { maxSize: bytes };
};

export const parseDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) throw new Error('无效的日期格式');
  return date;
};

interface RenameVars {
  name: string;
  ext: string;
  date: (format?: string) => string;
  index: (padding?: number) => string;
  upper: (str: string) => string;
  lower: (str: string) => string;
}

interface DateFormat {
  yyyy: number; // 年
  MM: number;   // 月 
  dd: number;   // 日
  HH: number;   // 时
  mm: number;   // 分
  ss: number;   // 秒
}

function formatDate(date: Date, formatStr: string = 'yyyyMMdd'): string {
  const format: DateFormat = {
    yyyy: date.getFullYear(),
    MM: date.getMonth() + 1,
    dd: date.getDate(),
    HH: date.getHours(),
    mm: date.getMinutes(),
    ss: date.getSeconds()
  };

  return formatStr.replace(/(yyyy|MM|dd|HH|mm|ss)/g, (match) => {
    const value = format[match as keyof DateFormat];
    return match === 'yyyy' ?
      String(value) :
      String(value).padStart(2, '0');
  });
}

interface RenameFunction {
  name: string;
  fn: (...args: any[]) => string;
  description: string;
}

class FunctionRegistry {
  private functions: Map<string, RenameFunction>;
  private context: Record<string, any>;

  constructor() {
    this.functions = new Map();
    this.context = {};
  }

  register(func: RenameFunction): void {
    this.functions.set(func.name, func);
  }

  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  execute(name: string, args: string[]): string {
    const func = this.functions.get(name);
    if (!func) return '';

    // 从上下文中获取变量值
    const evaluatedArgs = args.map(arg => {
      if (arg.startsWith('{') && arg.endsWith('}')) {
        const varName = arg.slice(1, -1);
        return this.context[varName] || arg;
      }
      return arg;
    });
    console.log(name, evaluatedArgs);

    return func.fn.apply(this.context, evaluatedArgs);
  }

}

export class RenameParser {
  private pattern: string;
  private index: number;
  private registry: FunctionRegistry;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.index = 0;
    this.registry = new FunctionRegistry();
    this.registerDefaultFunctions();
  }

  private registerDefaultFunctions(): void {
    // 注册内置变量函数
    this.registry.register({
      name: 'name',
      fn: (str: string) => str.replace(/\.[^/.]+$/, ''),
      description: '获取文件名(不含扩展名)'
    });

    this.registry.register({
      name: 'ext',
      fn: (str: string) => str.match(/\.[^/.]+$/)?.[0] || '',
      description: '获取扩展名'
    });

    this.registry.register({
      name: 'date',
      fn: (_: string, format?: string) => formatDate(new Date(), format),
      description: '获取日期'
    });

    this.registry.register({
      name: 'index',
      fn: (_: string, padding: string | number = 3) => String(++this.index).padStart(Number(padding), '0'),
      description: '获取序号'
    });

    // 注册内置处理函数
    this.registry.register({
      name: 'upper',
      fn: (str: string) => str.toUpperCase(),
      description: '转大写'
    });

    this.registry.register({
      name: 'lower',
      fn: (str: string) => str.toLowerCase(),
      description: '转小写'
    });

    this.registry.register({
      name: 'replace',
      fn: (str: string, search: string = 'new_', replace: string = '') =>
        str.replace(new RegExp(search, 'g'), replace || ''),
      description: '替换文本(默认移除new_前缀)'
    });

    this.registry.register({
      name: 'slice',
      fn: (str: string, start: string | number, end?: string | number) => str.slice(Number(start), Number(end)),
      description: '截取文本'
    });

    this.registry.register({
      name: 'lastSplit',
      fn: (str: string, delimiter: string = 'new_') => {
        const lastIndex = str.lastIndexOf(delimiter);
        if (lastIndex === -1) return str;
        const result = str.slice(lastIndex);
        return result;
      },
      description: '保留最后一个分隔符及其后的文本'
    });

    this.registry.register({
      name: 'prefix',
      fn: (str: string, prefix: string) => `${prefix}${str}`,
      description: '添加前缀'
    });
    this.registry.register({
      name: 'suffix',
      fn: (str: string, suffix: string) => `${str}${suffix}`,
      description: '添加前缀'
    });
  }

  public registerFunction(func: RenameFunction): void {
    this.registry.register(func);
  }

  public parse(originalName: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const ext = originalName.match(/\.[^/.]+$/)?.[0] || '';

    this.registry.setContext('name', nameWithoutExt);
    this.registry.setContext('ext', ext);

    let result = this.pattern.replace(/{([^{}]+)}/g, (match: string, expr: string): string => {
      const [funcName, ...args] = expr.split(':');
      const funcResult = this.registry.execute(funcName, [originalName, ...args]);
      return funcResult !== null ? funcResult : match;
    });

    return result;
  }
}