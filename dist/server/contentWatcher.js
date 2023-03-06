"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentWatcher = void 0;
const node_hmr_1 = require("@upvotr/node-hmr");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const md5_1 = __importDefault(require("md5"));
class ContentWatcher extends node_hmr_1.Watcher {
    require;
    constructor(require) {
        super();
        this.require = require;
    }
    watch(id) {
        let previousMd5;
        let timeout;
        const resolvedPath = this.require.resolve(id);
        const watcher = (0, fs_1.watch)(resolvedPath, "utf-8", (e) => {
            if (e === "change") {
                clearTimeout(timeout);
                setTimeout(async () => {
                    const content = await (0, promises_1.readFile)(resolvedPath);
                    const currentMd5 = (0, md5_1.default)(content, {
                        asString: true
                    });
                    if (currentMd5 !== previousMd5) {
                        this.emit("update", id);
                        previousMd5 = currentMd5;
                    }
                }, 100);
            }
        });
        return () => watcher.close();
    }
}
exports.ContentWatcher = ContentWatcher;
//# sourceMappingURL=contentWatcher.js.map