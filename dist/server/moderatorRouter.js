"use strict";
const express_1 = require("express");
const session_1 = require("./session");
const mysql_1 = require("./mysql");
const webHooks_1 = require("./webHooks");
const postQuery_1 = require("../common/postQuery");
const types_1 = require("../common/types");
const moduleDef = {
    getPersistentValues() {
        return {};
    },
    cleanupPersistentValues() { },
    run() {
        const router = (0, express_1.Router)();
        router.use(session_1.appSession, (0, express_1.json)(), (req, res, next) => {
            if (!(req.session.moderator || req.session.admin))
                return res.sendStatus(401);
            next();
        });
        router.post("/:postId/add-tag", async (req, res) => {
            if (!("tagId" in req.body))
                return res.sendStatus(400);
            const [[tag]] = await mysql_1.db.execute("SELECT tagName, bgColor, textColor, private FROM tagDefinitions WHERE tagId = ?", [req.body.tagId]);
            if (!tag)
                res.sendStatus(400);
            await mysql_1.db.execute("INSERT IGNORE INTO tags(tagId, postId) VALUES(?, ?)", [
                req.body.tagId,
                req.params.postId
            ]);
            res.sendStatus(200);
            (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.TagAdd, {
                postId: parseInt(req.params.postId),
                tagId: req.body.tagId,
                tagName: tag.tagName,
                colors: {
                    background: `#${tag.bgColor ?? "FF7B26"}`,
                    text: `#${tag.textColor ?? "FFFFFF"}`
                },
                tagPrivate: tag.private
            });
        });
        router.post("/:postId/remove-tag", async (req, res) => {
            if (!("tagId" in req.body))
                return res.sendStatus(400);
            const [[tag]] = await mysql_1.db.execute("SELECT tagName, bgColor, textColor, private FROM tagDefinitions WHERE tagId = ?", [req.body.tagId]);
            if (!tag)
                res.sendStatus(400);
            await mysql_1.db.execute("DELETE FROM tags WHERE postId = ? AND tagId = ?", [
                req.params.postId,
                req.body.tagId
            ]);
            res.sendStatus(200);
            (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.TagRemove, {
                postId: parseInt(req.params.postId),
                tagId: req.body.tagId,
                tagName: tag.tagName,
                colors: {
                    background: `#${tag.bgColor ?? "FF7B26"}`,
                    text: `#${tag.textColor ?? "FFFFFF"}`
                },
                tagPrivate: tag.private
            });
        });
        router.post("/public/:postId", async (req, res) => {
            await mysql_1.db.execute("UPDATE posts SET public = TRUE WHERE postId = ?", [
                req.params.postId
            ]);
            res.sendStatus(200);
            const [[post]] = await mysql_1.db.execute((0, postQuery_1.generateQuery)(["postType", "title", "author as authorId", "plainText", "p.postId"], false, false, true, false, false, postQuery_1.postsQueryFrom, "p.postId = ?", false), [req.params.postId]);
            (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostPublicized, {
                postId: post.postId,
                title: post.title,
                url: `/${(0, types_1.getPostBasePathByType)(post.postType)}/${post.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
                authorId: post.authorId,
                authorName: post.authorName,
                previewSnippet: post.plainText.slice(0, 100)
            });
        });
        router.post("/private/:postId", async (req, res) => {
            await mysql_1.db.execute("UPDATE posts SET public = FALSE WHERE postId = ?", [
                req.params.postId
            ]);
            res.sendStatus(200);
            const [[post]] = await mysql_1.db.execute((0, postQuery_1.generateQuery)(["postType", "title", "author as authorId", "plainText", "p.postId"], false, false, true, false, false, postQuery_1.postsQueryFrom, "p.postId = ?", false), [req.params.postId]);
            (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostHidden, {
                postId: post.postId,
                title: post.title,
                url: `/${(0, types_1.getPostBasePathByType)(post.postType)}/${post.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
                authorId: post.authorId,
                authorName: post.authorName,
                previewSnippet: post.plainText.slice(0, 100)
            });
        });
        return router;
    },
    cleanup() { }
};
module.exports = moduleDef;
//# sourceMappingURL=moderatorRouter.js.map