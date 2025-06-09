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
    autoBackup?: boolean;
    retryTimes?: number;
    retryDelay?: number;
    compress?: boolean;
    forceUpload?: boolean;
    diffUpload?: boolean;
}
export declare function deploy(options?: Partial<DeployConfig>): Promise<void>;
export {};
