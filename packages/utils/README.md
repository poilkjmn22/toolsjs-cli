# @toolsjs-cli/utils

`@toolsjs-cli/utils` 是一个工具库，提供了一系列实用的函数和工具，旨在简化开发过程中的常见任务。

## 特性

- **文件操作**：提供文件读取、写入、删除等常用操作的封装。
- **字符串处理**：提供字符串格式化、转换等实用函数。
- **数组操作**：提供数组去重、排序、过滤等常用操作的封装。
- **异步工具**：提供异步操作的辅助函数，简化异步编程。

## 安装

您可以通过 npm 安装该库：

```bash
npm install @toolsjs-cli/utils
```

## 使用示例

### 文件操作

```typescript
import { readFile, writeFile } from '@toolsjs-cli/utils';

// 读取文件
const content = await readFile('./example.txt');
console.log(content);

// 写入文件
await writeFile('./output.txt', 'Hello, World!');
```

### 字符串处理

```typescript
import { capitalize } from '@toolsjs-cli/utils';

// 字符串首字母大写
const result = capitalize('hello world');
console.log(result); // 输出: Hello world
```

### 数组操作

```typescript
import { uniqueArray } from '@toolsjs-cli/utils';

// 数组去重
const arr = [1, 2, 2, 3, 4, 4, 5];
const uniqueArr = uniqueArray(arr);
console.log(uniqueArr); // 输出: [1, 2, 3, 4, 5]
```

## API 文档

### 文件操作

#### `readFile(filePath: string): Promise<string>`

读取指定路径的文件内容。

- **参数**:
  - `filePath`: 文件的路径。
- **返回**: 返回文件内容的 Promise。

#### `writeFile(filePath: string, content: string): Promise<void>`

将内容写入指定路径的文件。

- **参数**:
  - `filePath`: 文件的路径。
  - `content`: 要写入的内容。
- **返回**: 返回一个 Promise。

### 字符串处理

#### `capitalize(str: string): string`

将字符串的首字母大写。

- **参数**:
  - `str`: 要处理的字符串。
- **返回**: 返回处理后的字符串。

### 数组操作

#### `uniqueArray(arr: any[]): any[]`

去除数组中的重复元素。

- **参数**:
  - `arr`: 要处理的数组。
- **返回**: 返回去重后的数组。

## 贡献

欢迎提交问题和建议！如果您想为项目做出贡献，请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/YourFeature`)
3. 提交您的更改 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/YourFeature`)
5. 创建一个新的 Pull Request

## 许可证

该项目使用 MIT 许可证，详细信息请查看 [LICENSE](LICENSE) 文件。

# TODO
1. traverse遍历文件(夹)的处理目前使用Promise.all进行异步处理，效率更高，但是无法保证访问顺序；可以增加保证访问顺序的强化功能;
2. 对于大文件的处理会有性能瓶颈（内存溢出/时间等）;使用web-worker多线程处理是一种思路
