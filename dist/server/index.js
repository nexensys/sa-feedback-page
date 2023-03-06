"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_hmr_1 = require("@upvotr/node-hmr");
const contentWatcher_1 = require("./contentWatcher");
const typescript_1 = __importDefault(require("typescript"));
const dev = process.env.NODE_ENV !== "production";
if (dev) {
    const formatHost = {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
        getNewLine: () => typescript_1.default.sys.newLine
    };
    const configPath = typescript_1.default.findConfigFile("../", typescript_1.default.sys.fileExists, "tsconfig.server.json");
    const createProgram = typescript_1.default.createEmitAndSemanticDiagnosticsBuilderProgram;
    if (!configPath)
        throw new ReferenceError("No tsconfig file found!");
    const host = typescript_1.default.createWatchCompilerHost(configPath, {}, typescript_1.default.sys, createProgram, reportDiagnostic, reportWatchStatusChanged);
    function reportDiagnostic(diagnostic) {
        console.error("Error", diagnostic.code, ":", typescript_1.default.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()));
    }
    function reportWatchStatusChanged(diagnostic) {
        console.info(typescript_1.default.formatDiagnostic(diagnostic, formatHost));
    }
    typescript_1.default.createWatchProgram(host);
}
async function main() {
    const runtime = new node_hmr_1.HMRRuntime(dev && new contentWatcher_1.ContentWatcher(require), require);
    await runtime.import("./server.js");
}
main();
//# sourceMappingURL=index.js.map