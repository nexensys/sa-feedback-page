import express, { Request, Response, Router } from "express";
import next from "next";
import { db, reconnect, setup } from "./mysql";
import cookieParser from "cookie-parser";
import HMRRuntime, { ExportType, HotModule } from "@upvotr/node-hmr";
import { NextServer } from "next/dist/server/next";
import { Server } from "http";
import { ContentWatcher } from "./contentWatcher";

const moduleDef: HotModule<
  {
    app: NextServer;
    server: ReturnType<typeof express>;
    db: typeof db;
    dev: boolean;
    port: string | number;
    httpServer: Server;
    runtime: HMRRuntime;
  },
  {}
> = {
  async getPersistentValues() {
    const dev = process.env.NODE_ENV !== "production";
    const runtime = new HMRRuntime(dev && new ContentWatcher(require), require);

    const app = next({ dev, customServer: true, quiet: true });
    const handle = app.getRequestHandler();
    const port = process.env.PORT || 3000;
    await app.prepare();
    reconnect();
    await setup();
    const server = express();
    server.use(cookieParser());
    const userRouter = await runtime.import<
      ExportType<typeof import("./userRouter")>
    >("./userRouter.js");
    const postsRouter = await runtime.import<
      ExportType<typeof import("./postsRouter")>
    >("./postsRouter.js");
    const adminRouter = await runtime.import<
      ExportType<typeof import("./adminRouter")>
    >("./adminRouter.js");
    const moderatorRouter = await runtime.import("./moderatorRouter.js");
    server.use((req, res, next) => {
      res.setHeader("X-Frame-Options", "DENY");
      next();
    });
    server.use("/sessions", (req, res, next) =>
      userRouter.exports?.(req, res, next)
    );
    server.use("/postapi", (req, res, next) =>
      postsRouter.exports?.(req, res, next)
    );
    server.use("/admin", (req, res, next) =>
      adminRouter.exports?.(req, res, next)
    );
    server.use("/mod", (req, res, next) =>
      moderatorRouter.exports?.(req, res, next)
    );
    server.all("*", (req: Request, res: Response) => {
      return handle(req, res);
    });

    const httpServer = server.listen(port, (err?: any) => {
      if (err) throw err;
      console.log(
        `> Ready on http://localhost:${port} - env ${process.env.NODE_ENV}`
      );
    });

    return {
      app,
      server,
      dev,
      port,
      db,
      httpServer,
      runtime
    };
  },
  async cleanupPersistentValues({ app, httpServer, db, runtime }) {
    runtime.unimport("./userRouter.js");
    runtime.unimport("./postsRouter.js");
    runtime.unimport("./adminRouter.js");
    runtime.unimport("./moderatorRouter.js");
    try {
      await db.end();
      await app.close();
      httpServer.close();
      runtime.closeAll();
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  },
  run({ server, runtime }, emitUpdate) {
    return {};
  },
  cleanup({ server, runtime }, exports) {},
  updatePersistentValues: false
};

module.exports = moduleDef;
