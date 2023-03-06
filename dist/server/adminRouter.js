"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = require("express");
const session_1 = require("./session");
const mysql_1 = require("./mysql");
const postQuery_1 = require("../common/postQuery");
const types_1 = require("../common/types");
const jiti_1 = __importDefault(require("jiti"));
const webHooks_1 = require("./webHooks");
const jiti = (0, jiti_1.default)(__filename, { interopDefault: true, esmResolve: true });
const { fromMarkdown } = jiti("mdast-util-from-markdown");
const { gfm } = jiti("micromark-extension-gfm");
const { gfmFromMarkdown } = jiti("mdast-util-gfm");
const { toString } = jiti("mdast-util-to-string");
const moduleDef = {
    getPersistentValues() {
        return {};
    },
    cleanupPersistentValues() { },
    run(persistentValues, emitUpdate) {
        const router = (0, express_1.Router)();
        router.use(session_1.appSession, (req, res, next) => {
            if (!req.session.admin)
                res.sendStatus(401);
            else
                next();
        }, (0, express_1.json)());
        router.post("/add-tag", async (req, res) => {
            if (!("tagName" in req.body))
                return res.sendStatus(400);
            await mysql_1.db.execute("INSERT INTO tagDefinitions (tagName, bgColor, textColor, private) VALUES(?, ?, ?, ?)", [
                req.body.tagName,
                req.body.bgColor ?? null,
                req.body.textColor ?? null,
                !!req.body.private
            ]);
            res.sendStatus(200);
        });
        router.post("/delete-tag", async (req, res) => {
            if (!("tagId" in req.body))
                return res.sendStatus(400);
            await mysql_1.db.execute("DELETE FROM tagDefinitions WHERE tagId = ?", [
                req.body.tagId
            ]);
            await mysql_1.db.execute("DELETE FROM tags WHERE tagId = ?", [req.body.tagId]);
            res.sendStatus(200);
        });
        router.post("/change-tag", async (req, res) => {
            if (!("tagId" in req.body))
                return res.sendStatus(400);
            await mysql_1.db.execute(`UPDATE tagDefinitions SET
        tagName = COALESCE(?, tagName),
        bgColor = ?,
        textColor = ?,
        private = COALESCE(?, FALSE)
      WHERE tagId = ?`, [
                req.body.tagName ?? null,
                req.body.bgColor ?? null,
                req.body.textColor ?? null,
                req.body.private ?? null,
                req.body.tagId
            ]);
            res.sendStatus(200);
        });
        router.get("/admins", async (req, res) => {
            const [admins] = await mysql_1.db.query("SELECT username, userId, admin, moderator FROM users WHERE admin IS TRUE");
            res.json(admins);
        });
        router.get("/moderators", async (req, res) => {
            const [moderators] = await mysql_1.db.query("SELECT username, userId, admin, moderator FROM users WHERE moderator IS TRUE");
            res.json(moderators);
        });
        router.get("/users", async (req, res) => {
            const usersPerPage = parseInt(req.query.perPage) || 0;
            const offset = parseInt(req.query.offset) || 0;
            const [users] = await mysql_1.db.execute("SELECT username, userId, admin, moderator FROM users WHERE userId != '0' LIMIT ? OFFSET ?", [usersPerPage.toString(), offset.toString()]);
            res.json(users);
        });
        router.get("/userslist", async (req, res) => {
            const [users] = await mysql_1.db.query("SELECT username, userId FROM users");
            res.json(users);
        });
        router.post("/change-user", async (req, res) => {
            if (!("userId" in req.body))
                return res.sendStatus(400);
            await mysql_1.db.execute("UPDATE users SET admin = COALESCE(?, admin), moderator = COALESCE(?, moderator) WHERE userId = ?", [req.body.admin ?? null, req.body.moderator ?? null, req.body.userId]);
            res.sendStatus(200);
        });
        router.post("/delete-user", async (req, res) => {
            if (!("userId" in req.body))
                return res.sendStatus(400);
            await mysql_1.db.execute("DELETE FROM users WHERE userId = ?", [req.body.userId]);
            session_1.sessionStore.all((err, obj) => {
                if (err)
                    return;
                for (const sid in obj) {
                    session_1.sessionStore.destroy(sid);
                }
            });
            res.sendStatus(200);
        });
        router.get("/manage-posts", async (req, res) => {
            const usersPerPage = parseInt(req.query.perPage) || 0;
            const offset = (parseInt(req.query.offset) || 0) * usersPerPage;
            const [posts] = await mysql_1.db.execute((0, postQuery_1.generateQuery)([
                "p.title",
                "p.posted",
                "p.content",
                "p.postType",
                "p.postId",
                "p.author AS authorId"
            ], true, true, true, true, false, postQuery_1.postsQueryFrom, `GROUP BY p.postId
          LIMIT ? OFFSET ?`, true), [usersPerPage.toString(), offset.toString()]);
            res.json(posts);
        });
        router.post("/edit-post", async (req, res) => {
            if (!("postId" in req.body))
                return res.sendStatus(400);
            const postData = {
                title: req.body.title,
                content: req.body.content,
                postType: req.body.postType,
                plainText: req.body.content &&
                    toString(fromMarkdown(req.body.content, {
                        extensions: [gfm()],
                        mdastExtensions: [gfmFromMarkdown()]
                    })),
                authorId: req.body.authorId
            };
            await mysql_1.db.execute(`UPDATE posts SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        postType = COALESCE(?, postType),
        plainText = COALESCE(?, plainText),
        author = COALESCE(?, author)
      WHERE postId = ?`, [
                postData.title ?? null,
                postData.content ?? null,
                postData.postType ?? null,
                postData.plainText ?? null,
                postData.authorId ?? null,
                parseInt(req.body.postId)
            ]);
            res.sendStatus(200);
            const [[post]] = await mysql_1.db.execute((0, postQuery_1.generateQuery)(["postType", "title", "author as authorId", "plainText"], false, false, true, false, false, postQuery_1.postsQueryFrom, "p.postId = ?", false), [req.body.postId]);
            (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostEdit, {
                postId: req.body.postId,
                title: post.title,
                url: `/${(0, types_1.getPostBasePathByType)(req.body.postType)}/${req.body.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
                authorId: post.authorId,
                authorName: post.authorName,
                previewSnippet: post.plainText.slice(0, 100)
            });
        });
        router.post("/delete-post", async (req, res) => {
            if (!("postId" in req.body))
                return res.sendStatus(400);
            const [[post]] = await mysql_1.db.execute((0, postQuery_1.generateQuery)(["postType", "title", "author as authorId", "plainText"], false, false, true, false, false, postQuery_1.postsQueryFrom, "p.postId = ?", false), [req.body.postId]);
            await mysql_1.db.execute(`DELETE FROM posts WHERE postId = ?`, [req.body.postId]);
            await mysql_1.db.execute(`DELETE FROM tags WHERE postId = ?`, [req.body.postId]);
            res.sendStatus(200);
            (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostDelete, {
                postId: req.body.postId,
                title: post.title,
                url: `/${(0, types_1.getPostBasePathByType)(req.body.postType)}/${req.body.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
                authorId: post.authorId,
                authorName: post.authorName,
                previewSnippet: post.plainText.slice(0, 100)
            });
        });
        router.get("/webhooks", async (req, res) => {
            const [webhooks] = await mysql_1.db.query("SELECT eventType, requestURL, hookId FROM webhooks");
            res.json(webhooks);
        });
        router.post("/add-webhook", async (req, res) => {
            if (!("event" in req.body && "url" in req.body))
                return res.sendStatus(400);
            (0, webHooks_1.addWebhook)(req.body.event, req.body.url).then(() => res.sendStatus(200), () => res.sendStatus(400));
        });
        router.post("/remove-webhook", async (req, res) => {
            if (!("hookId" in req.body))
                return res.sendStatus(400);
            await mysql_1.db.execute("DELETE FROM webhooks WHERE hookId = ?", [
                req.body.hookId
            ]);
            res.sendStatus(200);
        });
        router.post("/edit-webhook", async (req, res) => {
            if (!("hookId" in req.body))
                res.sendStatus(400);
            await mysql_1.db.execute("UPDATE webhooks SET eventType = COALESCE(?, eventType), requestURL = COALESCE(?, requestURL) WHERE hookId = ?", [req.body.event ?? null, req.body.url ?? null, req.body.hookId]);
            res.sendStatus(200);
        });
        return router;
    },
    cleanup() { }
};
module.exports = moduleDef;
//# sourceMappingURL=adminRouter.js.map