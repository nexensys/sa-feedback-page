"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_1 = require("express");
const types_1 = require("../common/types");
const mysql_1 = require("./mysql");
const postQuery_1 = require("../common/postQuery");
const session_1 = require("./session");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_hmr_1 = __importDefault(require("@upvotr/node-hmr"));
const contentWatcher_1 = require("./contentWatcher");
const jiti_1 = __importDefault(require("jiti"));
const webHooks_1 = require("./webHooks");
const jiti = (0, jiti_1.default)(__filename, { interopDefault: true, esmResolve: true });
const { fromMarkdown } = jiti("mdast-util-from-markdown");
const { gfm } = jiti("micromark-extension-gfm");
const { gfmFromMarkdown } = jiti("mdast-util-gfm");
const { toString } = jiti("mdast-util-to-string");
const getLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    skip: (req) => {
        return req.ip === "::1";
    },
    skipFailedRequests: true
});
const postLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    skip: (req) => {
        return req.ip === "::1";
    },
    skipFailedRequests: true
});
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
                router.use((req, res, next) => {
                    if (req.method.toLowerCase() === "get")
                        return getLimiter(req, res, next);
                    if (req.method.toLowerCase() === "post")
                        return postLimiter(req, res, next);
                    next();
                });
                router.use(session_1.appSession);
                router.use((0, express_1.json)());
                const queryToRegex = (q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
                router.get("/posts", async (req, res) => {
                    const postType = req.query.postType
                        ? parseInt(req.query.postType)
                        : -1;
                    if (typeof types_1.PostType[postType] === "undefined")
                        return res.status(400).send("Invalid Post Type");
                    const sortBy = req.query.sortBy.toLowerCase() ?? "popular";
                    if (!["tag", "newest", "oldest", "popular"].includes(sortBy))
                        return res.status(400).send("Invalid Sort");
                    const tag = req.query.tag
                        ? decodeURIComponent(req.query.tag)
                        : undefined;
                    const query = "query" in req.query
                        ? decodeURIComponent(req.query.query)
                        : undefined;
                    const queryIsRegex = req.query.regex === "1";
                    if (!tag && sortBy === "tag")
                        return res.status(400).send("Missing Tag");
                    const limit = req.query.limit ?? "10";
                    const offset = req.query.offset ?? "0";
                    const searchFilter = typeof query === "string"
                        ? `${postType === types_1.PostType.Search ? "" : "AND"} (REGEXP_LIKE(title, ?) OR REGEXP_LIKE(plainText, ?))`
                        : "";
                    const searchFilterArgs = typeof query === "string"
                        ? [
                            queryIsRegex ? query || "." : queryToRegex(query) || ".",
                            queryIsRegex ? query || "." : queryToRegex(query) || "."
                        ]
                        : [];
                    const [sqlQuery, params] = sortBy === "popular"
                        ? [
                            (0, postQuery_1.generateQuery)(["title", "posted", "p.postId", "p.answeredBy"], true, !!(req.session.moderator || req.session.admin), true, true, false, postQuery_1.postsQueryFrom, `${postType === types_1.PostType.Search ? "" : "p.postType = ?"} ${searchFilter} AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY votes DESC LIMIT ? OFFSET ?`, false),
                            [
                                ...(postType === types_1.PostType.Search ? [] : [postType]),
                                ...searchFilterArgs,
                                !!(req.session.admin || req.session.moderator),
                                limit,
                                offset
                            ]
                        ]
                        : sortBy === "newest"
                            ? [
                                (0, postQuery_1.generateQuery)(["title", "posted", "p.postId", "p.answeredBy"], true, !!(req.session.moderator || req.session.admin), true, true, false, postQuery_1.postsQueryFrom, `${postType === types_1.PostType.Search ? "" : "p.postType = ?"} ${searchFilter} AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY posted DESC LIMIT ? OFFSET ?`, false),
                                [
                                    ...(postType === types_1.PostType.Search ? [] : [postType]),
                                    ...searchFilterArgs,
                                    !!(req.session.admin || req.session.moderator),
                                    limit,
                                    offset
                                ]
                            ]
                            : sortBy === "oldest"
                                ? [
                                    (0, postQuery_1.generateQuery)(["title", "posted", "p.postId", "p.answeredBy"], true, !!(req.session.moderator || req.session.admin), true, true, false, postQuery_1.postsQueryFrom, `${postType === types_1.PostType.Search ? "" : "p.postType = ?"} ${searchFilter} AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY posted ASC LIMIT ? OFFSET ?`, false),
                                    [
                                        ...(postType === types_1.PostType.Search ? [] : [postType]),
                                        ...searchFilterArgs,
                                        !!(req.session.admin || req.session.moderator),
                                        limit,
                                        offset
                                    ]
                                ]
                                : [
                                    (0, postQuery_1.generateQuery)(["title", "posted", "p.postId", "p.answeredBy"], true, !!(req.session.moderator || req.session.admin), true, true, false, postQuery_1.postsQueryFrom, `${postType === types_1.PostType.Search ? "" : "p.postType = ?"} ${searchFilter} ${searchFilter && "AND"} EXISTS(SELECT t.tagId FROM tags t
                      WHERE t.postId = p.postId AND t.tagId = ?)
                      AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY votes DESC LIMIT ? OFFSET ?`, false),
                                    [
                                        ...(postType === types_1.PostType.Search ? [] : [postType]),
                                        ...searchFilterArgs,
                                        parseInt(tag),
                                        !!(req.session.admin || req.session.moderator),
                                        limit,
                                        offset
                                    ]
                                ];
                    mysql_1.db.execute(sqlQuery, params)
                        .then(([posts]) => res.json(posts.map((p) => ({
                        ...p,
                        posted: p.posted.toString(),
                        votes: parseInt(p.votes)
                    }))))
                        .catch((e) => {
                        console.log(e);
                        if (e.errno === 3692)
                            res.json({ err: "Invalid Regex" });
                        else
                            res.status(400).send();
                    });
                });
                router.get("/recent", async (req, res) => {
                    const query = `SELECT
  title,
  ${postQuery_1.authorNameQuery},
  posted,
  SUM(IF(ISNULL(v.vote), 0, IF(v.vote, 1, -1))) AS votes,
  p.postId,
  p.postType,
  p.answeredBy,
  (SELECT IF(
    COUNT(t.tagId) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(t.tagId)
  ) FROM tags t WHERE t.postId = p.postId) AS tags
${postQuery_1.postsQueryFrom}
WHERE p.public = TRUE
GROUP BY p.postId
ORDER BY posted DESC LIMIT 10`;
                    const [posts] = await mysql_1.db.execute(query);
                    res.json(posts.map((p) => ({
                        ...p,
                        posted: p.posted.toString(),
                        votes: parseInt(p.votes)
                    })));
                });
                router.get("/tags", async (req, res) => {
                    const [tags] = await mysql_1.db.execute(`SELECT tagId, tagName, bgColor, textColor, private FROM tagDefinitions ${req.session.admin || req.session.moderator
                        ? ""
                        : `WHERE NOT COALESCE(private, FALSE)`} ORDER BY tagId ASC`);
                    res.json(tags);
                });
                router.post("/post", async (req, res) => {
                    if (!["title", "content", "postType"].every((p) => p in req.body))
                        return res.status(400).send();
                    const post = {
                        title: req.body.title,
                        content: req.body.content,
                        authorId: req.session.userId ?? "0",
                        reactions: [],
                        postType: {
                            suggestion: types_1.PostType.Suggestion,
                            bug: types_1.PostType.BugReport,
                            question: types_1.PostType.Question
                        }[req.body.postType] || types_1.PostType.Suggestion,
                        plainText: toString(fromMarkdown(req.body.content, {
                            extensions: [gfm()],
                            mdastExtensions: [gfmFromMarkdown()]
                        }))
                    };
                    const [{ insertId: postId }] = await mysql_1.db.execute(`INSERT INTO posts (title, content, author, reactions, postType, plainText) VALUES(?, ?, ?, ?, ?, ?)`, [
                        post.title,
                        post.content,
                        post.authorId,
                        post.reactions,
                        post.postType,
                        post.plainText
                    ]);
                    if (req.session.loggedIn)
                        await mysql_1.db.execute("INSERT IGNORE INTO votes (postId, userId, vote) VALUES(?, ?, ?)", [postId, req.session.userId, 1]);
                    const url = `/${(0, types_1.getPostBasePathByType)(post.postType)}/${postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`;
                    res.send(url);
                    const [[author]] = await mysql_1.db.execute("SELECT username FROM users WHERE userId = ?", [post.authorId]);
                    (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostCreate, {
                        postId,
                        url,
                        title: post.title,
                        previewSnippet: post.plainText.slice(0, 100),
                        authorName: author.username,
                        authorId: post.authorId
                    });
                });
                router.post("/edit-post/:postId", async (req, res) => {
                    const [[post]] = await mysql_1.db.execute("SELECT author AS authorId FROM posts where postId = ?", [req.params.postId]);
                    if (!post ||
                        (post.authorId !== req.session.userId && !req.session.admin))
                        return res.sendStatus(post ? 400 : 401);
                    await mysql_1.db.execute(`UPDATE posts SET
            content = COALESCE(?, content),
            plainText = COALESCE(?, plainText),
            title = COALESCE(?, title),
            lastEdit = CURRENT_TIMESTAMP
          WHERE postId = ?`, [
                        req.body.content ?? null,
                        typeof req.body.content === "string"
                            ? toString(fromMarkdown(req.body.content, {
                                extensions: [gfm()],
                                mdastExtensions: [gfmFromMarkdown()]
                            }))
                            : null,
                        req.body.title ?? null,
                        req.params.postId
                    ]);
                    res.sendStatus(200);
                    const [[newPost]] = await mysql_1.db.execute((0, postQuery_1.generateQuery)([
                        "postType",
                        "title",
                        "author as authorId",
                        "plainText",
                        "p.postId"
                    ], false, false, true, false, false, postQuery_1.postsQueryFrom, "p.postId = ?", false), [req.params.postId]);
                    (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostEdit, {
                        postId: newPost.postId,
                        title: newPost.title,
                        url: `/${(0, types_1.getPostBasePathByType)(newPost.postType)}/${newPost.postId}/${encodeURIComponent(newPost.title.replace(/\s+/g, "-").toLowerCase())}`,
                        authorId: newPost.authorId,
                        authorName: newPost.authorName,
                        previewSnippet: newPost.plainText.slice(0, 100)
                    });
                });
                router.get("/reactions/:postId", async (req, res) => {
                    const [[{ reactions }]] = await mysql_1.db.execute(`SELECT IF(
    COUNT(r.emoji) = 0,
    JSON_ARRAY(),
    JSON_ARRAYAGG(
      JSON_OBJECT(
        "type", r.emoji,
        "user", r.userId
      )
    )
  ) AS reactions
  FROM reactions r
  WHERE r.targetIsPost = TRUE AND r.target = ?`, [req.params.postId]);
                    res.json(reactions);
                });
                router.get("/comments/:postId", async (req, res) => {
                    const [comments] = await mysql_1.db.execute(postQuery_1.commentsQuery, [
                        req.params.postId
                    ]);
                    res.status(200).json(comments);
                });
                router.post("/comment/:postId", async (req, res) => {
                    if (!("content" in req.body))
                        return res.status(400).send();
                    const [{ insertId: commentId }] = await mysql_1.db.execute("INSERT INTO comments (content, author, postId, repliesTo) VALUES(?, ?, ?, ?)", [
                        req.body.content,
                        req.session.userId ?? "0",
                        req.params.postId,
                        req.body.repliesTo ?? null
                    ]);
                    const [[commentAuthor]] = await mysql_1.db.execute("SELECT userId, username FROM users WHERE userId = ?", [req.session.userId ?? "0"]);
                    if (req.session.loggedIn || req.body.repliesTo) {
                        const [[post]] = await mysql_1.db.execute("SELECT title, author as authorId, postType FROM posts where postId = ?", [req.params.postId]);
                        if (req.session.loggedIn && post.authorId !== req.session.userId) {
                            await mysql_1.db.execute(notificationsRouter.exports?.createNotification.query, notificationsRouter.exports?.createNotification(`New comment on your post "${post.title}"`, `${commentAuthor.username} posted a new comment`, `/${(0, types_1.getPostBasePathByType)(post.postType)}/${req.params.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}#comment-${commentId}`, post.authorId));
                        }
                        if (req.body.repliesTo) {
                            const [[originalComment]] = await mysql_1.db.execute(`SELECT author AS authorId FROM comments WHERE commentId = ?`, [req.body.repliesTo]);
                            if (req.session.userId !== originalComment.authorId)
                                await mysql_1.db.execute(notificationsRouter.exports?.createNotification
                                    .query, notificationsRouter.exports?.createNotification(`New reply to your comment on "${post.title}"`, `${commentAuthor.username} replied to your comment`, `/${(0, types_1.getPostBasePathByType)(post.postType)}/${req.params.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}#comment-${commentId}`, originalComment.authorId));
                        }
                        (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.CommentCreate, {
                            postId: parseInt(req.params.postId),
                            url: `/${(0, types_1.getPostBasePathByType)(post.postType)}/${req.params.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}#comment-${commentId}`,
                            commentId,
                            authorId: commentAuthor.userId,
                            authorName: commentAuthor.username
                        });
                    }
                    const [[comment]] = await mysql_1.db.execute(postQuery_1.commentsQuery.replace("c.postId = ?", "c.commentId = ?"), [commentId]);
                    res.status(200).json(comment);
                });
                router.post("/edit-comment/:commentId", async (req, res) => {
                    const [[comment]] = await mysql_1.db.execute("SELECT author AS authorId, username AS authorName, postId FROM comments LEFT JOIN users ON userId = author WHERE commentId = ?", [req.params.commentId]);
                    if (!("content" in req.body) ||
                        !comment ||
                        (comment.authorId !== req.session.userId && !req.session.admin))
                        return res.sendStatus(comment && "content" in req.body ? 400 : 401);
                    await mysql_1.db.execute("UPDATE comments SET content = ? WHERE commentId = ?", [req.body.content, req.params.commentId]);
                    res.sendStatus(200);
                    const [[post]] = await mysql_1.db.execute("SELECT postType, title FROM posts WHERE postId = ?", [comment.postId]);
                    (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.CommentEdit, {
                        postId: comment.postId,
                        commentId: parseInt(req.params.commentId),
                        url: `/${(0, types_1.getPostBasePathByType)(post.postType)}/${comment.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}#comment-${req.params.commentId}`,
                        authorId: comment.authorId,
                        authorName: comment.authorName
                    });
                });
                router.post("/delete-comment/:commentId", async (req, res) => {
                    const [[comment]] = await mysql_1.db.execute("SELECT author AS authorId, username AS authorName, postId FROM comments LEFT JOIN users ON userId = author WHERE commentId = ?", [req.params.commentId]);
                    if (!comment ||
                        (comment.authorId !== req.session.userId &&
                            !(req.session.admin || req.session.moderator)))
                        res.sendStatus(comment ? 401 : 400);
                    await mysql_1.db.execute("DELETE FROM comments WHERE commentId = ?", [
                        req.params.commentId
                    ]);
                    res.sendStatus(200);
                    const [[post]] = await mysql_1.db.execute("SELECT postType, title FROM posts WHERE postId = ?", [comment.postId]);
                    (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.CommentDelete, {
                        postId: comment.postId,
                        commentId: parseInt(req.params.commentId),
                        url: `/${(0, types_1.getPostBasePathByType)(post.postType)}/${comment.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}#comment-${req.params.commentId}`,
                        authorId: comment.authorId,
                        authorName: comment.authorName
                    });
                });
                router.post("/react", async (req, res) => {
                    if (!req.session.loggedIn)
                        return res.status(401).send();
                    if (!["emoji", "target", "targetType"].every((k) => k in req.body))
                        return res.status(400).send();
                    if ("remove" in req.body && req.body.remove) {
                        await mysql_1.db.execute("DELETE FROM reactions WHERE emoji = ? AND userId = ? AND target = ? AND targetIsPost = ?", [
                            req.body.emoji,
                            req.session.userId,
                            req.body.target,
                            req.body.targetType === "post"
                        ]);
                    }
                    else {
                        const [[{ numReactions }]] = await mysql_1.db.execute("SELECT COUNT(emoji) as numReactions FROM reactions WHERE userId = ? AND target =? AND targetIsPost = ?", [
                            req.session.userId,
                            req.body.target,
                            req.body.targetType === "post"
                        ]);
                        if (numReactions < 10)
                            await mysql_1.db.execute("INSERT IGNORE INTO reactions (emoji, userId, target, targetIsPost) VALUES(?, ?, ?, ?)", [
                                req.body.emoji,
                                req.session.userId,
                                req.body.target,
                                req.body.targetType === "post"
                            ]);
                        else
                            return res.status(400).send();
                    }
                    res.status(200).send();
                });
                router.post("/answer/:postId", async (req, res) => {
                    if (!("commentId" in req.body))
                        return res.sendStatus(400);
                    const [[post]] = await mysql_1.db.execute("SELECT author AS authorId, username AS authorName, plainText, title, postType FROM posts LEFT JOIN users ON author = userId WHERE postId = ?", [req.params.postId]);
                    if (!post ||
                        !(req.session.admin ||
                            req.session.moderator ||
                            req.session.userId === post.authorId))
                        return res.sendStatus(post ? 401 : 400);
                    await mysql_1.db.execute("UPDATE posts SET answeredBy = ? WHERE postId = ?", [
                        req.body.commentId,
                        req.params.postId
                    ]);
                    res.sendStatus(200);
                    (0, webHooks_1.emitWebhookEvent)(webHooks_1.WebhookEvent.PostAnswer, {
                        postId: parseInt(req.params.postId),
                        title: post.title,
                        url: `/${(0, types_1.getPostBasePathByType)(post.postType)}/${post.postId}/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}#comment-${req.body.commentId}`,
                        authorId: post.authorId,
                        authorName: post.authorName,
                        previewSnippet: post.plainText.slice(0, 100)
                    });
                });
                return router;
            })()
        };
    },
    cleanup({ runtime }) {
        runtime.unimport("./notificationsRouter.js");
    }
};
module.exports = moduleDef;
//# sourceMappingURL=postsRouter.js.map