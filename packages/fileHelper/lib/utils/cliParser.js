"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenameParser = exports.parseDate = exports.parseSizeFilter = void 0;
const parseSizeFilter = (sizeStr) => {
    if (!sizeStr)
        return {};
    const match = sizeStr.match(/([<>]?)(\d+)(KB|MB|GB)?/);
    if (!match)
        throw new Error('无效的大小格式');
    const [_, op, size, unit] = match;
    const multiplier = {
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024
    }[unit] || 1;
    const bytes = Number(size) * multiplier;
    return op === '>' ? { minSize: bytes } : { maxSize: bytes };
};
exports.parseSizeFilter = parseSizeFilter;
const parseDate = (dateStr) => {
    if (!dateStr)
        return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime()))
        throw new Error('无效的日期格式');
    return date;
};
exports.parseDate = parseDate;
function formatDate(date, formatStr = 'yyyyMMdd') {
    const format = {
        yyyy: date.getFullYear(),
        MM: date.getMonth() + 1,
        dd: date.getDate(),
        HH: date.getHours(),
        mm: date.getMinutes(),
        ss: date.getSeconds()
    };
    return formatStr.replace(/(yyyy|MM|dd|HH|mm|ss)/g, (match) => {
        const value = format[match];
        return match === 'yyyy' ?
            String(value) :
            String(value).padStart(2, '0');
    });
}
class FunctionRegistry {
    constructor() {
        this.functions = new Map();
        this.context = {};
    }
    register(func) {
        this.functions.set(func.name, func);
    }
    setContext(key, value) {
        this.context[key] = value;
    }
    execute(name, args) {
        const func = this.functions.get(name);
        if (!func)
            return '';
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
class RenameParser {
    constructor(pattern) {
        this.pattern = pattern;
        this.index = 0;
        this.registry = new FunctionRegistry();
        this.registerDefaultFunctions();
    }
    registerDefaultFunctions() {
        // 注册内置变量函数
        this.registry.register({
            name: 'name',
            fn: (str) => str.replace(/\.[^/.]+$/, ''),
            description: '获取文件名(不含扩展名)'
        });
        this.registry.register({
            name: 'ext',
            fn: (str) => { var _a; return ((_a = str.match(/\.[^/.]+$/)) === null || _a === void 0 ? void 0 : _a[0]) || ''; },
            description: '获取扩展名'
        });
        this.registry.register({
            name: 'date',
            fn: (_, format) => formatDate(new Date(), format),
            description: '获取日期'
        });
        this.registry.register({
            name: 'index',
            fn: (_, padding = 3) => String(++this.index).padStart(Number(padding), '0'),
            description: '获取序号'
        });
        // 注册内置处理函数
        this.registry.register({
            name: 'upper',
            fn: (str) => str.toUpperCase(),
            description: '转大写'
        });
        this.registry.register({
            name: 'lower',
            fn: (str) => str.toLowerCase(),
            description: '转小写'
        });
        this.registry.register({
            name: 'replace',
            fn: (str, search = 'new_', replace = '') => str.replace(new RegExp(search, 'g'), replace || ''),
            description: '替换文本(默认移除new_前缀)'
        });
        this.registry.register({
            name: 'slice',
            fn: (str, start, end) => str.slice(Number(start), Number(end)),
            description: '截取文本'
        });
        this.registry.register({
            name: 'lastSplit',
            fn: (str, delimiter = 'new_') => {
                const lastIndex = str.lastIndexOf(delimiter);
                if (lastIndex === -1)
                    return str;
                const result = str.slice(lastIndex);
                return result;
            },
            description: '保留最后一个分隔符及其后的文本'
        });
        this.registry.register({
            name: 'prefix',
            fn: (str, prefix) => `${prefix}${str}`,
            description: '添加前缀'
        });
        this.registry.register({
            name: 'suffix',
            fn: (str, suffix) => `${str}${suffix}`,
            description: '添加前缀'
        });
    }
    registerFunction(func) {
        this.registry.register(func);
    }
    parse(originalName) {
        var _a;
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const ext = ((_a = originalName.match(/\.[^/.]+$/)) === null || _a === void 0 ? void 0 : _a[0]) || '';
        this.registry.setContext('name', nameWithoutExt);
        this.registry.setContext('ext', ext);
        let result = this.pattern.replace(/{([^{}]+)}/g, (match, expr) => {
            const [funcName, ...args] = expr.split(':');
            const funcResult = this.registry.execute(funcName, [originalName, ...args]);
            return funcResult !== null ? funcResult : match;
        });
        return result;
    }
}
exports.RenameParser = RenameParser;
//# sourceMappingURL=cliParser.js.map