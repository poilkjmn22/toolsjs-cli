"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = deploy;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const ssh2_1 = require("ssh2");
const spinner_1 = require("./utils/spinner");
const p_limit_1 = __importDefault(require("p-limit"));
const archiver_1 = __importDefault(require("archiver"));
const minimatch_1 = __importDefault(require("minimatch"));
const defaultCfgPath = 'deploy.config.json';
async function loadConfig(configPath) {
    const defaultPath = path.join(process.cwd(), defaultCfgPath);
    const cfgPath = configPath || defaultPath;
    try {
        const content = await fs.readFile(cfgPath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`未找到配置文件: ${defaultCfgPath}`);
        }
        throw error;
    }
}
class ScpClient {
    constructor() {
        this.client = new ssh2_1.Client();
        this.spinner = new spinner_1.Spinner();
        this.retryTimes = 3;
        this.retryDelay = 1000;
    }
    async connect(config) {
        await new Promise((resolve, reject) => {
            this.client.on('ready', () => {
                resolve();
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password
            });
        });
        // 连接成功后，确保远程目录存在
        if (config.remotePath) {
            try {
                await this.execCommand(`mkdir -p ${config.remotePath}`);
            }
            catch (error) {
                console.warn(`警告: 无法创建远程目录 ${config.remotePath}`);
            }
        }
    }
    async uploadFile(localPath, remotePath, sftp) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(localPath);
            const writeStream = sftp.createWriteStream(remotePath);
            writeStream.on('close', resolve);
            writeStream.on('error', (error) => {
                console.error(`上传文件失败: ${localPath} 到 ${remotePath}`);
                console.error(`错误信息: ${error.message}`);
                reject(error);
            });
            readStream.pipe(writeStream);
        });
    }
    async checkPermissions(remotePath) {
        return new Promise((resolve) => {
            this.client.sftp((err, sftp) => {
                if (err)
                    return resolve(false);
                sftp.stat(remotePath, (err, stats) => {
                    if (err)
                        return resolve(false);
                    // 检查目录权限 (0o755 = rwxr-xr-x)
                    resolve((stats.mode & 0o777) >= 0o755);
                });
            });
        });
    }
    async checkRemoteDir(remotePath) {
        return new Promise((resolve) => {
            this.client.sftp((err, sftp) => {
                if (err)
                    return resolve(false);
                sftp.stat(remotePath, (err, stats) => {
                    if (err)
                        return resolve(false);
                    resolve(stats.isDirectory());
                });
            });
        });
    }
    async ensureRemoteDirectory(remotePath, sftp) {
        // 首先检查目录是否存在
        try {
            const exists = await new Promise((resolve) => {
                sftp.stat(remotePath, (err, stats) => {
                    if (err) {
                        resolve(false);
                    }
                    else {
                        resolve(stats.isDirectory());
                    }
                });
            });
            if (exists) {
                // 如果目录已存在，直接返回
                return;
            }
        }
        catch (error) {
            // 忽略检查错误，继续尝试创建
        }
        // 如果目录不存在，尝试创建
        const dirs = remotePath.split('/').filter(Boolean);
        let currentPath = '';
        for (const dir of dirs) {
            currentPath = currentPath ? path.posix.join(currentPath, dir) : `/${dir}`;
            try {
                // 每一级都先检查是否存在
                const dirExists = await new Promise((resolve) => {
                    sftp.stat(currentPath, (err, stats) => {
                        if (err) {
                            resolve(false);
                        }
                        else {
                            resolve(stats.isDirectory());
                        }
                    });
                });
                if (!dirExists) {
                    await new Promise((resolve, reject) => {
                        sftp.mkdir(currentPath, { mode: 0o755 }, (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        });
                    });
                }
            }
            catch (error) {
                // 如果是最终目标目录创建失败，则抛出错误
                if (currentPath === remotePath) {
                    throw error;
                }
                // 对于中间目录的错误，继续尝试
                console.warn(`警告: 目录 ${currentPath} 已存在或无权限创建`);
            }
        }
    }
    async uploadDir(localPath, remotePath, exclude = [], sftp) {
        // 确保远程目录存在
        await this.ensureRemoteDirectory(remotePath, sftp);
        const files = await fs.readdir(localPath);
        const limit = (0, p_limit_1.default)(5);
        const uploadPromises = files.map(file => {
            if (exclude.includes(file))
                return Promise.resolve();
            const localFilePath = path.join(localPath, file);
            const remoteFilePath = path.posix.join(remotePath, file);
            return limit(async () => {
                const stats = await fs.stat(localFilePath);
                if (stats.isDirectory()) {
                    await this.uploadDir(localFilePath, remoteFilePath, exclude, sftp);
                }
                else {
                    this.spinner.start(`上传: ${file}`);
                    await this.uploadFile(localFilePath, remoteFilePath, sftp);
                }
            });
        });
        await Promise.all(uploadPromises);
    }
    async withRetry(operation) {
        let lastError;
        for (let i = 0; i < this.retryTimes; i++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (i < this.retryTimes - 1) {
                    console.warn(`操作失败，${this.retryDelay / 1000}秒后重试(${i + 1}/${this.retryTimes})...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        throw lastError;
    }
    async compressDirectory(localPath, exclude = []) {
        const tempFile = path.join(process.cwd(), `.deploy-temp-${Date.now()}.zip`);
        const output = fs.createWriteStream(tempFile);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        output.on('close', () => {
            console.log(`压缩完成，文件大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)}MB`);
        });
        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('压缩警告:', err);
            }
            else {
                throw err;
            }
        });
        archive.on('error', (err) => {
            throw err;
        });
        archive.pipe(output);
        const getAllFiles = async (dirPath) => {
            const files = await fs.readdir(dirPath);
            const result = [];
            for (const file of files) {
                const fullPath = path.join(dirPath, file);
                const relativePath = path.relative(localPath, fullPath);
                if (exclude.some(pattern => {
                    return (0, minimatch_1.default)(relativePath, pattern) ||
                        (0, minimatch_1.default)(file, pattern) ||
                        relativePath.startsWith(pattern) ||
                        file === pattern;
                })) {
                    continue;
                }
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    const subFiles = await getAllFiles(fullPath);
                    result.push(...subFiles);
                }
                else {
                    result.push(fullPath);
                }
            }
            return result;
        };
        const files = await getAllFiles(localPath);
        for (const file of files) {
            const relativePath = path.relative(localPath, file);
            archive.file(file, { name: relativePath });
        }
        await archive.finalize();
        return tempFile;
    }
    async upload(localPath, remotePath, exclude = [], compress) {
        return this.withRetry(async () => {
            if (compress) {
                const stats = await fs.stat(localPath);
                if (stats.isDirectory()) {
                    this.spinner.start('压缩目录中...');
                    const zipFile = await this.compressDirectory(localPath, exclude);
                    this.spinner.succeed('压缩完成');
                    try {
                        await new Promise((resolve, reject) => {
                            this.client.sftp(async (err, sftp) => {
                                if (err)
                                    return reject(err);
                                try {
                                    const remoteDir = path.posix.dirname(remotePath);
                                    const remoteZipPath = `${remotePath}.zip`;
                                    const backupZipPath = `${remotePath}.zip.bak`;
                                    // 检查是否存在旧的压缩包，如果存在则备份
                                    await new Promise((resolve, reject) => {
                                        sftp.stat(remoteZipPath, (err, stats) => {
                                            if (!err) {
                                                // 存在旧文件，进行备份
                                                this.spinner.start('备份旧压缩包...');
                                                this.execCommand(`cp "${remoteZipPath}" "${backupZipPath}"`)
                                                    .then(() => {
                                                    this.spinner.succeed('备份完成');
                                                    resolve();
                                                })
                                                    .catch(reject);
                                            }
                                            else {
                                                resolve();
                                            }
                                        });
                                    });
                                    // 上传新的压缩包
                                    this.spinner.start('上传压缩包...');
                                    await this.uploadFile(zipFile, remoteZipPath, sftp);
                                    this.spinner.succeed('压缩包上传完成');
                                    // 解压文件
                                    this.spinner.start('解压文件中...');
                                    await this.execCommand(`cd ${path.posix.dirname(remotePath)} && unzip -o ${path.posix.basename(remotePath)}.zip -d ${path.posix.basename(remotePath)}`);
                                    this.spinner.succeed('解压完成');
                                    resolve();
                                }
                                catch (error) {
                                    reject(error);
                                }
                            });
                        });
                    }
                    finally {
                        // 只删除本地临时压缩文件
                        await fs.remove(zipFile).catch(err => {
                            console.warn('清理本地临时文件失败:', err);
                        });
                    }
                    return;
                }
            }
            // 非压缩模式的原有上传逻辑
            return new Promise((resolve, reject) => {
                this.client.sftp(async (err, sftp) => {
                    if (err)
                        return reject(err);
                    try {
                        const remoteDir = path.posix.dirname(remotePath);
                        await this.ensureRemoteDirectory(remoteDir, sftp);
                        const stats = await fs.stat(localPath);
                        if (stats.isDirectory()) {
                            await this.uploadDir(localPath, remotePath, exclude, sftp);
                        }
                        else {
                            await this.uploadFile(localPath, remotePath, sftp);
                        }
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
        });
    }
    async execCommand(command) {
        return new Promise((resolve, reject) => {
            this.client.exec(command, (err, stream) => {
                if (err)
                    return reject(err);
                let output = '';
                stream.on('data', (data) => {
                    output += data.toString();
                });
                stream.stderr.on('data', (data) => {
                    console.error(`错误: ${data}`);
                });
                stream.on('close', () => {
                    resolve(output);
                });
            });
        });
    }
    async postDeploy(script) {
        this.spinner.start('部署完成后在服务器上做些什么...');
        try {
            await this.execCommand(script);
            this.spinner.succeed('服务器执行脚本成功');
        }
        catch (error) {
            this.spinner.fail('服务器执行脚本失败');
            throw error;
        }
    }
    async preDeploy(script) {
        this.spinner.start('部署之前在服务器上做些什么...');
        try {
            await this.execCommand(script);
            this.spinner.succeed('服务器执行脚本成功');
        }
        catch (error) {
            this.spinner.fail('服务器执行脚本失败');
            throw error;
        }
    }
    close() {
        this.client.end();
    }
}
async function deploy(options = {}) {
    const spinner = new spinner_1.Spinner();
    const client = new ScpClient();
    try {
        const fileConfig = await loadConfig(options.config);
        const config = {
            ...fileConfig,
            ...options,
            port: options.port || fileConfig.port || 22,
            exclude: [...(fileConfig.exclude || []), ...(options.exclude || [])]
        };
        await client.connect(config);
        spinner.succeed('连接成功');
        if (config.preScript) {
            await client.preDeploy(config.preScript);
        }
        // 上传文件
        spinner.start('开始上传文件...');
        console.log(config, 'config');
        const stats = await fs.stat(config.localPath);
        await client.upload(config.localPath, config.remotePath, config.exclude, stats.isFile() ? false : config.compress);
        spinner.succeed('上传完成');
        if (config.postScript) {
            await client.postDeploy(config.postScript);
        }
    }
    catch (error) {
        spinner.fail('部署失败');
        throw error;
    }
    finally {
        client.close();
    }
}
//# sourceMappingURL=deploy.js.map