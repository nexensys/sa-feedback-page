import { HMRRuntime } from "@upvotr/node-hmr";
import { ContentWatcher } from "./contentWatcher";
import ts from "typescript";

const dev = process.env.NODE_ENV !== "production";

if (dev) {
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
  };

  const configPath = ts.findConfigFile(
    "../",
    ts.sys.fileExists,
    "tsconfig.server.json"
  );

  const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;

  if (!configPath) throw new ReferenceError("No tsconfig file found!");

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    createProgram,
    reportDiagnostic,
    reportWatchStatusChanged
  );

  function reportDiagnostic(diagnostic: ts.Diagnostic) {
    console.error(
      "Error",
      diagnostic.code,
      ":",
      ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        formatHost.getNewLine()
      )
    );
  }

  function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
    console.info(ts.formatDiagnostic(diagnostic, formatHost));
  }

  ts.createWatchProgram(host);
}

async function main() {
  const runtime = new HMRRuntime(dev && new ContentWatcher(require), require);

  await runtime.import<typeof import("./server.js")>("./server.js");
}

main();
