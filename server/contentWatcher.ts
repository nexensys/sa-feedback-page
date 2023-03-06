import { Watcher } from "@upvotr/node-hmr";
import { watch } from "fs";
import { readFile } from "fs/promises";
import md5 from "md5";

export class ContentWatcher extends Watcher {
  constructor(private require: NodeJS.Require) {
    super();
  }

  watch(id: string): () => void {
    let previousMd5: string;
    let timeout: NodeJS.Timeout;
    const resolvedPath = this.require.resolve(id);
    const watcher = watch(resolvedPath, "utf-8", (e) => {
      if (e === "change") {
        clearTimeout(timeout);
        setTimeout(async () => {
          const content = await readFile(resolvedPath);
          const currentMd5 = md5(content, {
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
