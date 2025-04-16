import * as readline from 'readline';

export class Spinner {
  private message: string;
  private isSpinning: boolean;
  private spinnerFrames: string[];
  private currentFrame: number;
  private interval: NodeJS.Timeout | null;

  constructor() {
    this.message = '';
    this.isSpinning = false;
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentFrame = 0;
    this.interval = null;
  }

  start(text: string): this {
    this.message = text;
    this.isSpinning = true;
    this.render();
    return this;
  }

  succeed(text?: string): this {
    this.stop();
    console.log(`✔ ${text || this.message}`);
    return this;
  }

  fail(text?: string): this {
    this.stop();
    console.log(`✖ ${text || this.message}`);
    return this;
  }

  info(text: string): this {
    this.stop();
    console.log(`ℹ ${text}`);
    return this;
  }

  stop(): this {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isSpinning = false;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    return this;
  }

  private render(): void {
    this.interval = setInterval(() => {
      const frame = this.spinnerFrames[this.currentFrame];
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`${frame} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.spinnerFrames.length;
    }, 80);
  }
}