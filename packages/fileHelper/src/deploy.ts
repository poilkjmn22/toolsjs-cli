import * as fs from 'fs-extra';
import * as path from 'path';
import { Client } from 'ssh2';
import { Spinner } from './utils/spinner';
import pLimit from 'p-limit';
import archiver from 'archiver';
import minimatch from 'minimatch';
import { readFile } from 'fs/promises';

interface DeployConfig {
  config?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  localPath: string;
  remotePath: string;
  exclude?: string[];
  postScript?: string;
  preScript?: string;
  autoBackup?: boolean; // 部署之前执行备份
  retryTimes?: number; // 连接服务器重试次数
  retryDelay?: number; // 连接服务器超时时间
  compress?: boolean; // 压缩后再上传
  forceUpload?: boolean; // 强制上传所有文件
  diffUpload?: boolean; // 是否启用差异上传
}

const defaultCfgPath = 'deploy.config.json';
async function loadConfig(configPath?: string): Promise<Partial<DeployConfig>> {
  const defaultPath = path.join(process.cwd(), defaultCfgPath);
  const cfgPath = configPath || defaultPath;

  try {
    const content = await fs.readFile(cfgPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`未找到配置文件: ${defaultCfgPath},将使用默认配置项`);
    return {
      localPath: "./dist",
      remotePath: "/home/dist"
    }
  }
}

class ScpClient {
  private client: Client;
  private spinner: Spinner;
  private retryTimes: number;
  private retryDelay: number;

  constructor() {
    this.client = new Client();
    this.spinner = new Spinner();
    this.retryTimes = 6;
    this.retryDelay = 1000;
  }

  async connect(config: DeployConfig): Promise<void> {
    await new Promise<void>((resolve, reject) => {
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
      } catch (error) {
        console.warn(`警告: 无法创建远程目录 ${config.remotePath}`);
      }
    }
  }

  private async checkPermissions(remotePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.sftp((err, sftp) => {
        if (err) return resolve(false);
        sftp.stat(remotePath, (err, stats) => {
          if (err) return resolve(false);
          // 检查目录权限 (0o755 = rwxr-xr-x)
          resolve((stats.mode & 0o777) >= 0o755);
        });
      });
    });
  }

  private async checkRemoteDir(remotePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.sftp((err, sftp) => {
        if (err) return resolve(false);
        sftp.stat(remotePath, (err, stats) => {
          if (err) return resolve(false);
          resolve(stats.isDirectory());
        });
      });
    });
  }

  private async ensureRemoteDirectory(remotePath: string, sftp: any): Promise<void> {
    // 首先检查目录是否存在
    try {
      const exists = await new Promise<boolean>((resolve) => {
        sftp.stat(remotePath, (err: NodeJS.ErrnoException | null, stats: any) => {
          if (err) {
            resolve(false);
          } else {
            resolve(stats.isDirectory());
          }
        });
      });

      if (exists) {
        // 如果目录已存在，直接返回
        return;
      }
    } catch (error) {
      // 忽略检查错误，继续尝试创建
    }

    // 如果目录不存在，尝试创建
    const dirs = remotePath.split('/').filter(Boolean);
    let currentPath = '';

    for (const dir of dirs) {
      currentPath = currentPath ? path.posix.join(currentPath, dir) : `/${dir}`;
      try {
        // 每一级都先检查是否存在
        const dirExists = await new Promise<boolean>((resolve) => {
          sftp.stat(currentPath, (err: NodeJS.ErrnoException | null, stats: any) => {
            if (err) {
              resolve(false);
            } else {
              resolve(stats.isDirectory());
            }
          });
        });

        if (!dirExists) {
          await new Promise<void>((resolve, reject) => {
            sftp.mkdir(currentPath, { mode: 0o755 }, (err: NodeJS.ErrnoException | null) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        }
      } catch (error) {
        // 如果是最终目标目录创建失败，则抛出错误
        if (currentPath === remotePath) {
          throw error;
        }
        // 对于中间目录的错误，继续尝试
        console.warn(`警告: 目录 ${currentPath} 已存在或无权限创建`);
      }
    }
  }

  async uploadDir(localPath: string, remotePath: string, exclude: string[] = [], sftp: any): Promise<void> {
    // 确保远程目录存在
    await this.ensureRemoteDirectory(remotePath, sftp);

    const files = await fs.readdir(localPath);
    const limit = pLimit(5);

    const uploadPromises = files.map(file => {

      const localFilePath = path.join(localPath, file);
      if (exclude.some(pattern => {
        return minimatch(localFilePath, pattern) ||
          minimatch(file, pattern) ||
          localFilePath.startsWith(pattern) ||
          file === pattern;
      })) {
        return Promise.resolve();
      }
      const remoteFilePath = path.posix.join(remotePath, file);
      return limit(async () => {
        const stats = await fs.stat(localFilePath);
        if (stats.isDirectory()) {
          await this.uploadDir(localFilePath, remoteFilePath, exclude, sftp);
        } else {
          this.spinner.start(`上传: ${file}`);
          await this.uploadFile(localFilePath, remoteFilePath, sftp);
        }
      });
    });

    await Promise.all(uploadPromises);
  }

  async uploadFile(localPath: string, remotePath: string, sftp: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);

      writeStream.on('close', () => {
        // console.log(`文件上传成功: ${localPath} 到 ${remotePath}`);
        resolve();
      });

      writeStream.on('error', (error: { message: any; }) => {
        console.error(`上传文件失败: ${localPath} 到 ${remotePath}`);
        console.error(`错误信息: ${error.message}`);
        reject(error);
      });

      readStream.on('error', (error) => {
        console.error(`读取文件失败: ${localPath}`);
        console.error(`错误信息: ${error.message}`);
        reject(error);
      });

      readStream.pipe(writeStream);
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError;
    for (let i = 0; i < this.retryTimes; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < this.retryTimes - 1) {
          console.warn(`操作失败，${this.retryDelay / 1000}秒后重试(${i + 1}/${this.retryTimes})...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    throw lastError;
  }

  private async compressDirectory(localPath: string, exclude: string[] = []): Promise<string> {
    const tempFile = path.join(process.cwd(), `.deploy-temp-${Date.now()}.zip`);
    const output = fs.createWriteStream(tempFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`压缩完成，文件大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)}MB`);
    });

    archive.on('warning', (err: any) => {
      if (err.code === 'ENOENT') {
        console.warn('压缩警告:', err);
      } else {
        throw err;
      }
    });

    archive.on('error', (err: any) => {
      throw err;
    });

    archive.pipe(output);

    const getAllFiles = async (dirPath: string): Promise<string[]> => {
      const files = await fs.readdir(dirPath);
      const result: string[] = [];

      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(localPath, fullPath);

        if (exclude.some(pattern => {
          return minimatch(relativePath, pattern) ||
            minimatch(file, pattern) ||
            relativePath.startsWith(pattern) ||
            file === pattern;
        })) {
          continue;
        }

        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          const subFiles = await getAllFiles(fullPath);
          result.push(...subFiles);
        } else {
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

  async upload(localPath: string, remotePath: string, exclude: string[] = [], compress?: boolean): Promise<void> {
    return this.withRetry(async () => {
      if (compress) {
        const stats = await fs.stat(localPath);
        if (stats.isDirectory()) {
          this.spinner.start('压缩目录中...');
          const zipFile = await this.compressDirectory(localPath, exclude);
          this.spinner.succeed('压缩完成');

          try {
            await new Promise<void>((resolve, reject) => {
              this.client.sftp(async (err, sftp) => {
                if (err) return reject(err);
                try {
                  const remoteDir = path.posix.dirname(remotePath);
                  const remoteZipPath = `${remotePath}.zip`;
                  const backupZipPath = `${remotePath}.zip.bak`;

                  // 检查是否存在旧的压缩包，如果存在则备份
                  await new Promise<void>((resolve, reject) => {
                    sftp.stat(remoteZipPath, (err: Error | undefined, stats) => {
                      if (!err) {
                        // 存在旧文件，进行备份
                        this.spinner.start('备份旧压缩包...');
                        this.execCommand(`cp "${remoteZipPath}" "${backupZipPath}"`)
                          .then(() => {
                            this.spinner.succeed('备份完成');
                            resolve();
                          })
                          .catch(reject);
                      } else {
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
                } catch (error) {
                  reject(error);
                }
              });
            });
          } finally {
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
          if (err) return reject(err);
          try {
            const remoteDir = path.posix.dirname(remotePath);
            await this.ensureRemoteDirectory(remoteDir, sftp);

            const stats = await fs.stat(localPath);
            if (stats.isDirectory()) {
              await this.uploadDir(localPath, remotePath, exclude, sftp);
            } else {
              await this.uploadFile(localPath, remotePath, sftp);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  async execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);

        let output = '';
        stream.on('data', (data: Buffer) => {
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

  async postDeploy(script: string): Promise<void> {
    this.spinner.start('部署完成后在服务器上做些什么...');
    try {
      await this.execCommand(script);
      this.spinner.succeed('服务器执行脚本成功');
    } catch (error) {
      this.spinner.fail('服务器执行脚本失败');
      throw error;
    }
  }

  async preDeploy(script: string): Promise<void> {
    this.spinner.start('部署之前在服务器上做些什么...');
    try {
      await this.execCommand(script);
      this.spinner.succeed('服务器执行脚本成功');
    } catch (error) {
      this.spinner.fail('服务器执行脚本失败');
      throw error;
    }

  }
  async preDeployAutoBackup(remotePath: string): Promise<void> {
    try {
      await this.execCommand(`mv ${remotePath} ${remotePath}_bak${new Date().toLocaleString()}`);
      this.spinner.succeed(`服务器备份部署目录<${remotePath}>成功`);
    } catch (error) {
      this.spinner.fail(`服务器备份部署目录<${remotePath}>失败`);
      throw error;
    }

  }

  close(): void {
    this.client.end();
  }
}

async function getDiffFilePath(fallback: string): Promise<string> {
  try {
    const bacfgCont = await readFile(path.join(process.cwd(), "buildAnalyzer.config.json"), 'utf-8');
    const bacfg = JSON.parse(bacfgCont);
    const diffFilePath = path.join(bacfg.reportDir, `${path.basename(path.join(process.cwd(), bacfg.buildDir))}.zip`);
    console.warn(`发现差异部署文件，将使用${diffFilePath}部署`);
    return diffFilePath;
  } catch (error) {
    console.info('未发现差异部署文件，将使用原有部署文件（夹）');
    return fallback;
  }
}
export async function deploy(options: Partial<DeployConfig> = {}): Promise<void> {
  const spinner = new Spinner();
  const client = new ScpClient();

  try {
    const fileConfig = await loadConfig(options.config);
    const config: DeployConfig = {
      localPath: options.localPath || fileConfig.localPath || "./dist",
      remotePath: options.remotePath || fileConfig.remotePath || "/home/dist",
      ...fileConfig,
      ...options,
      port: options.port || fileConfig.port || 22,
      exclude: [...(fileConfig.exclude || []), ...(options.exclude || [])]
    };

    await client.connect(config);
    spinner.succeed('连接成功');

    if (config.autoBackup) {
      await client.preDeployAutoBackup(config.remotePath);
    }
    if (config.preScript) {
      await client.preDeploy(config.preScript);
    }
    // 上传文件
    spinner.start('开始上传文件...');
    // console.log(config, 'config')
    let localPath = config.diffUpload ? await getDiffFilePath(config.localPath) : config.localPath;
    // let localPath = "./distReport/sdfdsf.txt";
    const stats = await fs.stat(localPath);
    // console.log(localPath, stats, 'localPath')
    if (stats.isFile() && path.basename(localPath) !== path.basename(config.remotePath)) {
      config.remotePath = path.posix.join(config.remotePath, path.basename(localPath))
    }
    const shouldCompress = stats.isFile() ? false : config.compress;
    await client.upload(localPath, config.remotePath, config.exclude, shouldCompress);
    spinner.succeed('上传完成');

    if (config.postScript) {
      await client.postDeploy(config.postScript);
    }

    if (!shouldCompress && /\.zip$/.test(localPath)) {
      spinner.start('解压文件中...');
      await client.execCommand(`cd ${path.posix.dirname(config.remotePath)} && unzip -o ${path.posix.basename(config.remotePath)}`);
      spinner.succeed('解压完成');
    }

  } catch (error) {
    spinner.fail('部署失败');
    throw error;
  } finally {
    client.close();
  }
}