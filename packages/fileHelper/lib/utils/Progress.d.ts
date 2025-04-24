export declare class Progress {
    private message;
    constructor(message: string);
    start(): void;
    succeed(message?: string): void;
    fail(message?: string): void;
}
