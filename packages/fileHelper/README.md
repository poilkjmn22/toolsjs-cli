# @toolsjs-cli/file-helper

文件处理工具包，支持服务器部署、文件批量操作等功能。

## 特性

- 📦 支持文件压缩上传
- 🔄 自动重试机制
- 🔒 支持备份和回滚
- 📁 批量文件操作(删除/移动/重命名...等)
- 🚀 并发任务数量控制（向服务器请求等典型场景）
- 💻 支持自定义部署完成前后的脚本

## 安装

\`\`\`bash
npm install @toolsjs-cli/file-helper
\`\`\`

## CLI 命令

### 部署命令 (deploy)

\`\`\`bash
# 使用配置文件部署
file-helper deploy

# 指定配置文件部署
file-helper deploy -c ./custom-config.json

# 使用命令行参数
file-helper deploy --host example.com --username root --password 123456 --local-path ./dist --remote-path /var/www/app

# 启用压缩上传
file-helper deploy --compress

# 排除文件
file-helper deploy --exclude "node_modules,*.log,temp"

# 设置重试次数和延迟
file-helper deploy --retry-times 5 --retry-delay 2000

# 部署前后执行脚本
file-helper deploy --pre-script "pm2 stop app" --post-script "pm2 start app"
\`\`\`

### 文件移动命令 (move)

\`\`\`bash
# 移动文件或目录
file-helper move <源路径> <目标路径>

# 按扩展名移动
file-helper move ./src -e "jpg,png,gif" --pattern "IMG_*"

# 按大小筛选移动
file-helper move ./downloads -s ">1MB"

# 按日期筛选移动
file-helper move ./logs --older-than "2023-01-01"
file-helper move ./docs --newer-than "2023-06-01"

# 重命名文件
file-helper move ./photos -r "{date:yyyy-MM-dd}_{name}{ext}"

# 排除特定文件
file-helper move ./src -x "*.tmp,*.log"

# 试运行模式（不实际移动）
file-helper move ./src ./dest --dry-run

# 强制覆盖已存在的文件
file-helper move ./src ./dest --overwrite
\`\`\`

### 文件删除命令 (delete)

\`\`\`bash
# 删除文件或目录
file-helper delete <目标路径>

# 按扩展名删除
file-helper delete ./temp -e "tmp,cache"

# 按文件大小删除
file-helper delete ./downloads -s "<100KB"

# 按日期删除
file-helper delete ./logs --older-than "2023-01-01"

# 排除特定文件
file-helper delete ./cache -x "important.*"

# 试运行模式（不实际删除）
file-helper delete ./temp --dry-run
\`\`\`

## 配置文件

### deploy.config.json
\`\`\`json
{
  "host": "your-server.com",
  "port": 22,
  "username": "your-username",
  "password": "your-password",
  "localPath": "./dist",
  "remotePath": "/var/www/app",
  "exclude": ["node_modules", "*.log"],
  "compress": true,
  "retryTimes": 3,
  "retryDelay": 1000,
  "preScript": "pm2 stop app",
  "postScript": "pm2 start app"
  "diffUpload": "false"
}
\`\`\`

## API 使用

\`\`\`typescript
import { deploy, batchMove, batchDelete } from '@toolsjs-cli/file-helper';

// 部署
await deploy({
  host: 'example.com',
  port: 22,
  username: 'root',
  password: '123456',
  localPath: './dist',
  remotePath: '/var/www/app',
  compress: true,
  exclude: ['node_modules', '*.log']
});

// 批量移动文件
await batchMove('./src', {
  extensions: ['jpg', 'png'],
  pattern: 'IMG_*',
  minSize: 1024 * 1024, // 1MB
  olderThan: new Date('2023-01-01'),
  renameRule: '{date}_{name}{ext}'
});

// 批量删除文件
await batchDelete('./temp', {
  extensions: ['tmp', 'cache'],
  newerThan: new Date('2023-06-01'),
  maxSize: 1024 * 100 // 100KB
});
\`\`\`

## API 文档

### DeployConfig
\`\`\`typescript
interface DeployConfig {
  config?: string;        // 配置文件路径
  host: string;          // 服务器地址
  port: number;          // SSH端口
  username: string;      // 用户名
  password: string;      // 密码
  localPath: string;     // 本地源目录
  remotePath: string;    // 远程目标目录
  exclude?: string[];    // 排除的文件
  preScript?: string;    // 部署前执行的脚本
  postScript?: string;   // 部署后执行的脚本
  retryTimes?: number;   // 重试次数
  retryDelay?: number;   // 重试延迟(ms)
  compress?: boolean;    // 是否压缩上传
  forceUpload?: boolean; // 强制上传所有文件
  diffUpload?: boolean; // 启用差异部署
}
\`\`\`

## 环境要求

- Node.js >= 16.0.0
- 支持 TypeScript

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 开发计划

### 2.0.0 版本计划
- 📄 文档转换功能
  - PDF 转换支持
  - Excel 文件转换
  - Word 文档转换
  - 图片格式转换
  - 批量转换支持
  - 自定义转换模板
- 🔍 文件内容搜索
- 📊 文件统计分析
- 🔐 SSH 密钥认证支持

## 更新日志

### 1.0.0
- 初始版本发布
- 支持文件部署功能
- 支持文件批量移动
- 支持文件批量删除
- 支持压缩上传
- 支持文件排除
- 支持部署脚本
- 支持自动重试

# TODO
1. 部署文件、批处理文件中的exclude逻辑仍有完善和优化的空间，尤其注意启用差异部署(diffUpload: true)时，exclude逻辑不一致会导致部署的资源不同步的问题
2. 单元测试等还不完整，功能模块的质量有一定的隐患