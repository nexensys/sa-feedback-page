"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const next_1 = __importDefault(require("next"));
const mysql_1 = require("./mysql");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_hmr_1 = __importDefault(require("@upvotr/node-hmr"));
const contentWatcher_1 = require("./contentWatcher");
const moduleDef = {
    async getPersistentValues() {
        const dev = process.env.NODE_ENV !== "production";
        const runtime = new node_hmr_1.default(dev && new contentWatcher_1.ContentWatcher(require), require);
        const app = (0, next_1.default)({ dev, customServer: true, quiet: true });
        const handle = app.getRequestHandler();
        const port = process.env.PORT || 3000;
        await app.prepare();
        (0, mysql_1.reconnect)();
        await (0, mysql_1.setup)();
        const server = (0, express_1.default)();
        server.use((0, cookie_parser_1.default)());
        const userRouter = await runtime.import("./userRouter.js");
        const postsRouter = await runtime.import("./postsRouter.js");
        const adminRouter = await runtime.import("./adminRouter.js");
        const moderatorRouter = await runtime.import("./moderatorRouter.js");
        server.use((req, res, next) => {
            res.setHeader("X-Frame-Options", "DENY");
            next();
        });
        server.use("/sessions", (req, res, next) => userRouter.exports?.(req, res, next));
        server.use("/postapi", (req, res, next) => postsRouter.exports?.(req, res, next));
        server.use("/admin", (req, res, next) => adminRouter.exports?.(req, res, next));
        server.use("/mod", (req, res, next) => moderatorRouter.exports?.(req, res, next));
        server.all("*", (req, res) => {
            return handle(req, res);
        });
        const httpServer = server.listen(port, (err) => {
            if (err)
                throw err;
            console.log(`> Ready on http://localhost:${port} - env ${process.env.NODE_ENV}`);
        });
        return {
            app,
            server,
            dev,
            port,
            db: mysql_1.db,
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
        }
        catch (e) {
            console.error(e);
            process.exit(1);
        }
    },
    run({ server, runtime }, emitUpdate) {
        return {};
    },
    cleanup({ server, runtime }, exports) { },
    updatePersistentValues: false
};
module.exports = moduleDef;
//# sourceMappingURL=server.js.map