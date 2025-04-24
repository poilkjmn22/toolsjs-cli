export declare class Spinner {
    private message;
    private isSpinning;
    private spinnerFrames;
    private currentFrame;
    private interval;
    constructor();
    start(text: string): this;
    succeed(text?: string): this;
    fail(text?: string): this;
    info(text: string): this;
    stop(): this;
    private render;
}
