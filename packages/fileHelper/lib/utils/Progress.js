"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Progress = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Progress {
    constructor(message) {
        this.message = message;
    }
    start() {
        console.log(chalk_1.default.blue('⇒'), this.message);
    }
    succeed(message) {
        console.log(chalk_1.default.green('✓'), message || this.message);
    }
    fail(message) {
        console.log(chalk_1.default.red('✗'), message || this.message);
    }
}
exports.Progress = Progress;
//# sourceMappingURL=Progress.js.map