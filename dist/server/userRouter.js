"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = require("express");
const url_1 = require("url");
const mysql_1 = require("./mysql");
const uuid_1 = require("uuid");
const session_1 = require("./session");
const node_hmr_1 = __importDefault(require("@upvotr/node-hmr"));
const contentWatcher_1 = require("./contentWatcher");
const admins_secret_json_1 = __importDefault(require("./admins.secret.json"));
const moduleDef = {
    getPersistentValues() {
        const dev = process.env.NODE_ENV !== "production";
        const runtime = new node_hmr_1.default(dev && new contentWatcher_1.ContentWatcher(require), require);
        return {
            runtime
        };
    },
    cleanupPersistentValues({ runtime }) {
        runtime.closeAll();
    },
    run({ runtime }, emitUpdate) {
        const router = (0, express_1.Router)();
        return {
            __hmrIsPromise: true,
            promise: (async () => {
                const notificationsRouter = await runtime.import("./notificationsRouter.js");
                router.use((0, express_1.json)());
                router.use(session_1.appSession);
                router.get("/login", async (req, res) => {
                    const url = new url_1.URL(req.url, `${req.protocol}://${req.headers.host}`);
                    const redirect = req.query.r;
                    const verifyURL = Buffer.from(`${req.protocol}://${url.host /* Use localhost in development, the actual url in production */}/sessions/verify${redirect || "" /* Will be an encodedURIComponent */}`).toString("base64");
                    if (req.session.loggedIn) {
                        const [[{ hasUser }]] = await mysql_1.db.execute("SELECT EXISTS(SELECT userId FROM users WHERE userId = ?) AS hasUser", [req.session.userId]);
                        if (hasUser)
                            return res.redirect(decodeURIComponent(redirect || "") || "/");
                    }
                    res.redirect(`https://auth.itinerary.eu.org/auth/?redirect=${verifyURL}&name=Scratch%20Addons%20Feedback`);
                });
                router.get(["/verify", "/verify/*"], async (req, res) => {
                    const url = new url_1.URL(req.url, `${req.protocol}://${req.headers.host}`);
                    const privateCode = req.query.privateCode || "";
                    const validationReq = await fetch(`https://auth.itinerary.eu.org/api/auth/verifyToken?privateCode=${privateCode}`, { method: "GET" });
                    const authData = (await validationReq.json());
                    const [[{ userExists }]] = await mysql_1.db.execute("SELECT EXISTS(SELECT 1 FROM users WHERE username = ? LIMIT 1) AS userExists", [authData.username]);
                    if (!userExists) {
                        const accountDataReq = await fetch(`https://api.scratch.mit.edu/users/${authData.username}`);
                        const accountData = await accountDataReq.json();
                        const data = {
                            username: authData.username,
                            anonymous: false,
                            pfpURL: accountData.profile.images["90x90"],
                            userId: (0, uuid_1.v1)(),
                            admin: admins_secret_json_1.default.includes(authData.username)
                        };
                        await mysql_1.db.execute("INSERT INTO users (username, avatarUrl, anonymous, userId, admin) VALUES(?, ?, ?, ?, ?)", [
                            data.username,
                            data.pfpURL,
                            data.anonymous,
                            data.userId,
                            data.admin
                        ]);
                    }
                    const [[userData]] = await mysql_1.db.execute("SELECT userId, admin, moderator FROM users WHERE username = ?", [authData.username]);
                    req.session.userId = userData.userId;
                    req.session.loggedIn = true;
                    req.session.admin = userData.admin;
                    req.session.moderator = userData.moderator;
                    const redirectPath = decodeURIComponent(url.pathname.match(/\/verify(\/.*)$/)?.[1] || "") || "/";
                    res.redirect(redirectPath);
                });
                router.get("/session", async (req, res) => {
                    const [[user]] = await mysql_1.db.execute(`SELECT
      username,
      avatarUrl,
      admin,
      moderator
    FROM users WHERE userId = ?`, [req.session.userId || null]);
                    if (req.session.loggedIn && !user) {
                        delete req.session.userId;
                        delete req.session.loggedIn;
                        delete req.session.admin;
                        delete req.session.moderator;
                    }
                    else if (user) {
                        req.session.admin = user.admin;
                        req.session.moderator = user.moderator;
                        // Hmmmmm
                    }
                    res.status(200).json({
                        username: user?.username || null,
                        admin: !!user?.admin,
                        moderator: !!user?.moderator,
                        avatar: user?.avatarUrl || null,
                        userId: req.session?.userId || null
                    });
                });
                router.get("/logout", (req, res) => {
                    req.session.destroy(() => {
                        res.redirect("/");
                    });
                });
                router.get("/useravatar/:userId", async (req, res) => {
                    const [[user]] = await mysql_1.db.execute("SELECT avatarUrl, anonymous FROM users WHERE userId = ?", [req.params.userId]);
                    if (user && !user.anonymous)
                        return res.redirect(user.avatarUrl);
                    res.status(404).redirect("/images/default_user.png");
                });
                router.get("/votes/:postId", async (req, res) => {
                    if (!req.session.loggedIn)
                        return res.status(401).send();
                    const [[viewerVote]] = await mysql_1.db.execute(`
    SELECT
      IF(v.vote, 'up', 'down') AS vote
    FROM votes v
    WHERE postId = ? AND userId = ?`, [req.params.postId, req.session.userId]);
                    res.status(200).json(viewerVote?.vote ?? null);
                });
                router.post("/votes/:postId", async (req, res) => {
                    const postId = parseInt(req.params.postId);
                    if (!req.session.loggedIn)
                        return res.status(401).send();
                    if (typeof req.body.vote === "string" &&
                        !["up", "down"].includes(req.body.vote.toLowerCase()))
                        return res.status(400).send();
                    await mysql_1.db.execute(`
INSERT INTO votes (postId, userId, vote) VALUES(?, ?, ?)
ON DUPLICATE KEY UPDATE vote = ?`, [
                        postId,
                        req.session.userId,
                        req.body.vote === "up",
                        req.body.vote === "up"
                    ]);
                    res.status(200).send();
                });
                router.post("/update", async (req, res) => {
                    if (!req.session.loggedIn)
                        return res.sendStatus(401);
                    if (!("anonymous" in req.body))
                        return res.sendStatus(400);
                    await mysql_1.db.execute("UPDATE users SET anonymous = ? WHERE userId = ?", [
                        req.body.anonymous,
                        req.session.userId
                    ]);
                    res.sendStatus(200);
                });
                router.use("/notifications", (req, res, next) => notificationsRouter.exports?.(req, res, next));
                return router;
            })()
        };
    },
    cleanup({ runtime }) {
        runtime.unimport("./notificationsRouter.js");
    }
};
module.exports = moduleDef;
//# sourceMappingURL=userRouter.js.map