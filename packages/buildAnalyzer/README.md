# Build Analyzer

## 简介

`Build Analyzer` 是一个用于分析构建打包产物的工具，旨在帮助开发者了解构建的文件大小、变更情况等等统计分析以及优化建议。通过提供详细的构建报告，用户可以更好地管理和优化前端项目的构建过程、打包质量以及改进web网站性能等

## 特性

- **构建统计**：提供构建次数、文件总数和总大小等基本统计信息。
- **文件变更**：跟踪新增、更新和删除的文件。
- **大文件警告**：识别超过指定大小的文件，并提供优化建议。
- **低频修改文件**：通过缓存优先级算法(修改频率较低/文件较大等)推荐最适合做缓存的文件，并提供缓存建议。
- **部署建议**：根据构建情况提供增量或全量部署的建议。

## 安装

确保您已经安装了 Node.js 和 npm。然后在项目根目录下运行以下命令安装依赖：

```bash
npm install
```

## 使用

### 1. 配置

在项目中创建一个配置文件 `buildAnalyzer.config.json`，示例内容如下：

```json
{
    "buildDir": "./dist",
    "reportDir": "./distReport",
    "overSizeThreshold": "500KB",
    "maxCount": 10,
    "minCount": 5,
    "filesizeSpec": "KB",
    "exclude": ["*.gz", "*.bak"]
}
```

```package.json
{
    ...
    "scripts": {
        ...
        "build-analyzer": "node ./node_modules/@toolsjs-cli/build-analyzer/bin/cli.js",
        ...
    }
    ...
}
或者
{
    ...
    "bin": {
        ...
        "build-analyzer": "./node_modules/@toolsjs-cli/build-analyzer/bin/cli.js",
        ...
    }
    ...
}
```

### 2. 运行分析

使用以下命令运行构建分析：

```bash
build-analyzer
```

### 3. 查看报告

运行后，控制台将输出构建分析报告，包括基本统计信息、大文件警告、低频修改文件和部署建议。

## 示例

以下是一个示例输出：

```
📊 构建分析报告
----------------------------------------
📈 基本统计
构建分析次数: 1
文件总数量: 20
总大小: 1.2MB
大小变化: +200KB

🔄 文件变更
新增: 5 个文件
更新: 10 个文件
删除: 5 个文件

⚠ 大文件警告，超过了[500KB]
| 文件路径          | 文件大小  |
|-------------------|------------|
| src/largeFile.js  | 600KB     |
| src/anotherFile.js| 550KB     |

🎉 很好！未发现大文件，您的项目保持轻量！

🔍 建议使用缓存的文件
| 文件路径          | 文件大小  | 修改次数 |
|-------------------|------------|----------|
| src/lowFreqFile.js| 200KB     | 1        |

💡 部署建议
✓ 建议使用增量部署
----------------------------------------
```

## 贡献

欢迎提交问题和建议！如果您想为项目做出贡献，请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/YourFeature`)
3. 提交您的更改 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/YourFeature`)
5. 创建一个新的 Pull Request

## 许可证

该项目使用 MIT 许可证，详细信息请查看 [LICENSE](LICENSE) 文件。

```

# TODO
1. exclude的逻辑仍有完善和优化的空间; 统计分析报告里面的exclude应该与生成的差异压缩包的exclude逻辑不一样（如前端打包产物里的压缩包*.gz等不应该被统计分析，但应该被包含到差异压缩包里）
2. reportMode的模式增加html/...等，将会比Console用户体验更友好