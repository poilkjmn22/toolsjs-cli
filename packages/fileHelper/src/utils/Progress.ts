import chalk from 'chalk';

export class Progress {
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    console.log(chalk.blue('⇒'), this.message);
  }

  succeed(message?: string): void {
    console.log(chalk.green('✓'), message || this.message);
  }

  fail(message?: string): void {
    console.log(chalk.red('✗'), message || this.message);
  }
}