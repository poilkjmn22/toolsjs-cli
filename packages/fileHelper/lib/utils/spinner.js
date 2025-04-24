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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = void 0;
const readline = __importStar(require("readline"));
class Spinner {
    constructor() {
        this.message = '';
        this.isSpinning = false;
        this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.currentFrame = 0;
        this.interval = null;
    }
    start(text) {
        this.message = text;
        this.isSpinning = true;
        this.render();
        return this;
    }
    succeed(text) {
        this.stop();
        console.log(`✔ ${text || this.message}`);
        return this;
    }
    fail(text) {
        this.stop();
        console.log(`✖ ${text || this.message}`);
        return this;
    }
    info(text) {
        this.stop();
        console.log(`ℹ ${text}`);
        return this;
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isSpinning = false;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        return this;
    }
    render() {
        this.interval = setInterval(() => {
            const frame = this.spinnerFrames[this.currentFrame];
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`${frame} ${this.message}`);
            this.currentFrame = (this.currentFrame + 1) % this.spinnerFrames.length;
        }, 80);
    }
}
exports.Spinner = Spinner;
//# sourceMappingURL=spinner.js.map