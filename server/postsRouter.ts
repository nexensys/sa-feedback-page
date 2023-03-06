import { Router, json } from "express";
import {
  Post,
  PostType,
  Reaction,
  getPostBasePathByType
} from "../common/types";
import { IComment, IPost, ITag, IUserData, db } from "./mysql";
import {
  postsQueryFrom,
  authorNameQuery,
  commentsQuery,
  generateQuery
} from "../common/postQuery";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { appSession } from "./session";
import rateLimit from "express-rate-limit";
import HMRRuntime, { ExportType, HotModule } from "@upvotr/node-hmr";
import { ContentWatcher } from "./contentWatcher";
import createJITI from "jiti";
import { WebhookEvent, emitWebhookEvent } from "./webHooks";

const jiti = createJITI(__filename, { interopDefault: true, esmResolve: true });

const { fromMarkdown } = jiti(
  "mdast-util-from-markdown"
) as typeof import("mdast-util-from-markdown");
const { gfm } = jiti(
  "micromark-extension-gfm"
) as typeof import("micromark-extension-gfm");
const { gfmFromMarkdown } = jiti(
  "mdast-util-gfm"
) as typeof import("mdast-util-gfm");
const { toString } = jiti(
  "mdast-util-to-string"
) as typeof import("mdast-util-to-string");

const getLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  skip: (req) => {
    return req.ip === "::1";
  },
  skipFailedRequests: true
});

const postLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  skip: (req) => {
    return req.ip === "::1";
  },
  skipFailedRequests: true
});

const moduleDef: HotModule<{ runtime: HMRRuntime }, Router> = {
  getPersistentValues() {
    const dev = process.env.NODE_ENV !== "production";
    const runtime = new HMRRuntime(dev && new ContentWatcher(require), require);
    return {
      runtime
    };
  },
  cleanupPersistentValues({ runtime }) {
    runtime.closeAll();
  },
  run({ runtime }, emitUpdate) {
    const router = Router();

    return {
      __hmrIsPromise: true,
      promise: (async () => {
        const notificationsRouter = await runtime.import<
          ExportType<typeof import("./notificationsRouter")>
        >("./notificationsRouter.js");
        router.use((req, res, next) => {
          if (req.method.toLowerCase() === "get")
            return getLimiter(req, res, next);
          if (req.method.toLowerCase() === "post")
            return postLimiter(req, res, next);
          next();
        });

        router.use(appSession);
        router.use(json());

        const queryToRegex = (q: string) =>
          q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");

        router.get("/posts", async (req, res) => {
          const postType: PostType = req.query.postType
            ? parseInt(req.query.postType as string)
            : -1;
          if (typeof PostType[postType] === "undefined")
            return res.status(400).send("Invalid Post Type");
          const sortBy: string =
            (req.query.sortBy as string).toLowerCase() ?? "popular";
          if (!["tag", "newest", "oldest", "popular"].includes(sortBy))
            return res.status(400).send("Invalid Sort");
          const tag = (req.query.tag as string)
            ? decodeURIComponent(req.query.tag as string)
            : undefined;
          const query =
            "query" in req.query
              ? decodeURIComponent(req.query.query as string)
              : undefined;
          const queryIsRegex = req.query.regex === "1";
          if (!tag && sortBy === "tag")
            return res.status(400).send("Missing Tag");
          const limit = (req.query.limit as string) ?? "10";
          const offset = (req.query.offset as string) ?? "0";
          const searchFilter =
            typeof query === "string"
              ? `${
                  postType === PostType.Search ? "" : "AND"
                } (REGEXP_LIKE(title, ?) OR REGEXP_LIKE(plainText, ?))`
              : "";
          const searchFilterArgs =
            typeof query === "string"
              ? [
                  queryIsRegex ? query || "." : queryToRegex(query) || ".",
                  queryIsRegex ? query || "." : queryToRegex(query) || "."
                ]
              : [];
          const [sqlQuery, params] =
            sortBy === "popular"
              ? [
                  generateQuery(
                    ["title", "posted", "p.postId", "p.answeredBy"],
                    true,
                    !!(req.session.moderator || req.session.admin),
                    true,
                    true,
                    false,
                    postsQueryFrom,
                    `${
                      postType === PostType.Search ? "" : "p.postType = ?"
                    } ${searchFilter} AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY votes DESC LIMIT ? OFFSET ?`,
                    false
                  ),
                  [
                    ...(postType === PostType.Search ? [] : [postType]),
                    ...searchFilterArgs,
                    !!(req.session.admin || req.session.moderator),
                    limit,
                    offset
                  ]
                ]
              : sortBy === "newest"
              ? [
                  generateQuery(
                    ["title", "posted", "p.postId", "p.answeredBy"],
                    true,
                    !!(req.session.moderator || req.session.admin),
                    true,
                    true,
                    false,
                    postsQueryFrom,
                    `${
                      postType === PostType.Search ? "" : "p.postType = ?"
                    } ${searchFilter} AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY posted DESC LIMIT ? OFFSET ?`,
                    false
                  ),
                  [
                    ...(postType === PostType.Search ? [] : [postType]),
                    ...searchFilterArgs,
                    !!(req.session.admin || req.session.moderator),
                    limit,
                    offset
                  ]
                ]
              : sortBy === "oldest"
              ? [
                  generateQuery(
                    ["title", "posted", "p.postId", "p.answeredBy"],
                    true,
                    !!(req.session.moderator || req.session.admin),
                    true,
                    true,
                    false,
                    postsQueryFrom,
                    `${
                      postType === PostType.Search ? "" : "p.postType = ?"
                    } ${searchFilter} AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY posted ASC LIMIT ? OFFSET ?`,
                    false
                  ),
                  [
                    ...(postType === PostType.Search ? [] : [postType]),
                    ...searchFilterArgs,
                    !!(req.session.admin || req.session.moderator),
                    limit,
                    offset
                  ]
                ]
              : [
                  generateQuery(
                    ["title", "posted", "p.postId", "p.answeredBy"],
                    true,
                    !!(req.session.moderator || req.session.admin),
                    true,
                    true,
                    false,
                    postsQueryFrom,
                    `${
                      postType === PostType.Search ? "" : "p.postType = ?"
                    } ${searchFilter} ${
                      searchFilter && "AND"
                    } EXISTS(SELECT t.tagId FROM tags t
                      WHERE t.postId = p.postId AND t.tagId = ?)
                      AND (public = TRUE OR ? = TRUE)
                    GROUP BY p.postId ORDER BY votes DESC LIMIT ? OFFSET ?`,
                    false
                  ),
                  [
                    ...(postType === PostType.Search ? [] : [postType]),
                    ...searchFilterArgs,
                    parseInt(tag!),
                    !!(req.session.admin || req.session.moderator),
                    limit,
                    offset
                  ]
                ];
          db.execute<IPost[]>(sqlQuery, params)
            .then(([posts]) =>
              res.json(
                posts.map((p) => ({
                  ...p,
                  posted: p.posted.toString(),
                  votes: parseInt(p.votes as unknown as string)
                }))
              )
            )
            .catch((e) => {
              console.log(e);
              if (e.errno === 3692) res.json({ err: "Invalid Regex" });
              else res.status(400).send();
            });
        });

        router.get("/recent", async (req, res) => {
          const query = `SELECT
  title,
  ${authorNameQuery},
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
${postsQueryFrom}
WHERE p.public = TRUE
GROUP BY p.postId
ORDER BY posted DESC LIMIT 10`;
          const [posts] = await db.execute<IPost[]>(query);

          res.json(
            posts.map((p) => ({
              ...p,
              posted: p.posted.toString(),
              votes: parseInt(p.votes as unknown as string)
            }))
          );
        });

        router.get("/tags", async (req, res) => {
          const [tags] = await db.execute<ITag[]>(
            `SELECT tagId, tagName, bgColor, textColor, private FROM tagDefinitions ${
              req.session.admin || req.session.moderator
                ? ""
                : `WHERE NOT COALESCE(private, FALSE)`
            } ORDER BY tagId ASC`
          );

          res.json(tags);
        });

        router.post("/post", async (req, res) => {
          if (!["title", "content", "postType"].every((p) => p in req.body))
            return res.status(400).send();
          const post: Partial<Post> = {
            title: req.body.title,
            content: req.body.content,
            authorId: req.session.userId ?? "0",
            reactions: [],
            postType:
              {
                suggestion: PostType.Suggestion,
                bug: PostType.BugReport,
                question: PostType.Question
              }[req.body.postType as string] || PostType.Suggestion,
            plainText: toString(
              fromMarkdown(req.body.content, {
                extensions: [gfm()],
                mdastExtensions: [gfmFromMarkdown()]
              })
            )
          };

          const [{ insertId: postId }] = await db.execute<ResultSetHeader>(
            `INSERT INTO posts (title, content, author, reactions, postType, plainText) VALUES(?, ?, ?, ?, ?, ?)`,
            [
              post.title,
              post.content,
              post.authorId,
              post.reactions,
              post.postType,
              post.plainText
            ]
          );
          if (req.session.loggedIn)
            await db.execute(
              "INSERT IGNORE INTO votes (postId, userId, vote) VALUES(?, ?, ?)",
              [postId, req.session.userId, 1]
            );

          const url = `/${getPostBasePathByType(
            post.postType!
          )}/${postId}/${encodeURIComponent(
            post.title!.replace(/\s+/g, "-").toLowerCase()
          )}`;

          res.send(url);

          const [[author]] = await db.execute<IUserData[]>(
            "SELECT username FROM users WHERE userId = ?",
            [post.authorId!]
          );

          emitWebhookEvent(WebhookEvent.PostCreate, {
            postId,
            url,
            title: post.title!,
            previewSnippet: post.plainText!.slice(0, 100),
            authorName: author.username,
            authorId: post.authorId!
          });
        });

        router.post("/edit-post/:postId", async (req, res) => {
          const [[post]] = await db.execute<IPost[]>(
            "SELECT author AS authorId FROM posts where postId = ?",
            [req.params.postId]
          );

          if (
            !post ||
            (post.authorId !== req.session.userId && !req.session.admin)
          )
            return res.sendStatus(post ? 400 : 401);

          await db.execute(
            `UPDATE posts SET
            content = COALESCE(?, content),
            plainText = COALESCE(?, plainText),
            title = COALESCE(?, title),
            lastEdit = CURRENT_TIMESTAMP
          WHERE postId = ?`,
            [
              req.body.content ?? null,
              typeof req.body.content === "string"
                ? toString(
                    fromMarkdown(req.body.content, {
                      extensions: [gfm()],
                      mdastExtensions: [gfmFromMarkdown()]
                    })
                  )
                : null,
              req.body.title ?? null,
              req.params.postId
            ]
          );

          res.sendStatus(200);

          const [[newPost]] = await db.execute<IPost[]>(
            generateQuery(
              [
                "postType",
                "title",
                "author as authorId",
                "plainText",
                "p.postId"
              ],
              false,
              false,
              true,
              false,
              false,
              postsQueryFrom,
              "p.postId = ?",
              false
            ),
            [req.params.postId]
          );

          emitWebhookEvent(WebhookEvent.PostEdit, {
            postId: newPost.postId,
            title: newPost.title,
            url: `/${getPostBasePathByType(newPost.postType)}/${
              newPost.postId
            }/${encodeURIComponent(
              newPost.title.replace(/\s+/g, "-").toLowerCase()
            )}`,
            authorId: newPost.authorId,
            authorName: newPost.authorName,
            previewSnippet: newPost.plainText.slice(0, 100)
          });
        });

        router.get("/reactions/:postId", async (req, res) => {
          const [[{ reactions }]] = await db.execute<
            ({ reactions: Reaction[] } & RowDataPacket)[]
          >(
            `SELECT IF(
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
  WHERE r.targetIsPost = TRUE AND r.target = ?`,
            [req.params.postId]
          );

          res.json(reactions);
        });

        router.get("/comments/:postId", async (req, res) => {
          const [comments] = await db.execute<IComment[]>(commentsQuery, [
            req.params.postId
          ]);

          res.status(200).json(comments);
        });

        router.post("/comment/:postId", async (req, res) => {
          if (!("content" in req.body)) return res.status(400).send();

          const [{ insertId: commentId }] = await db.execute<ResultSetHeader>(
            "INSERT INTO comments (content, author, postId, repliesTo) VALUES(?, ?, ?, ?)",
            [
              req.body.content,
              req.session.userId ?? "0",
              req.params.postId,
              req.body.repliesTo ?? null
            ]
          );
          const [[commentAuthor]] = await db.execute<IUserData[]>(
            "SELECT userId, username FROM users WHERE userId = ?",
            [req.session.userId ?? "0"]
          );

          if (req.session.loggedIn || req.body.repliesTo) {
            const [[post]] = await db.execute<IPost[]>(
              "SELECT title, author as authorId, postType FROM posts where postId = ?",
              [req.params.postId]
            );

            if (req.session.loggedIn && post.authorId !== req.session.userId) {
              await db.execute(
                notificationsRouter.exports?.createNotification.query as string,
                notificationsRouter.exports?.createNotification(
                  `New comment on your post "${post.title}"`,
                  `${commentAuthor.username} posted a new comment`,
                  `/${getPostBasePathByType(post.postType)}/${
                    req.params.postId
                  }/${encodeURIComponent(
                    post.title!.replace(/\s+/g, "-").toLowerCase()
                  )}#comment-${commentId}`,
                  post.authorId
                )
              );
            }
            if (req.body.repliesTo) {
              const [[originalComment]] = await db.execute<IComment[]>(
                `SELECT author AS authorId FROM comments WHERE commentId = ?`,
                [req.body.repliesTo]
              );

              if (req.session.userId !== originalComment.authorId)
                await db.execute(
                  notificationsRouter.exports?.createNotification
                    .query as string,
                  notificationsRouter.exports?.createNotification(
                    `New reply to your comment on "${post.title}"`,
                    `${commentAuthor.username} replied to your comment`,
                    `/${getPostBasePathByType(post.postType)}/${
                      req.params.postId
                    }/${encodeURIComponent(
                      post.title!.replace(/\s+/g, "-").toLowerCase()
                    )}#comment-${commentId}`,
                    originalComment.authorId
                  )
                );
            }

            emitWebhookEvent(WebhookEvent.CommentCreate, {
              postId: parseInt(req.params.postId),
              url: `/${getPostBasePathByType(post.postType)}/${
                req.params.postId
              }/${encodeURIComponent(
                post.title!.replace(/\s+/g, "-").toLowerCase()
              )}#comment-${commentId}`,
              commentId,
              authorId: commentAuthor.userId,
              authorName: commentAuthor.username
            });
          }

          const [[comment]] = await db.execute<IComment[]>(
            commentsQuery.replace("c.postId = ?", "c.commentId = ?"),
            [commentId]
          );

          res.status(200).json(comment);
        });

        router.post("/edit-comment/:commentId", async (req, res) => {
          const [[comment]] = await db.execute<IComment[]>(
            "SELECT author AS authorId, username AS authorName, postId FROM comments LEFT JOIN users ON userId = author WHERE commentId = ?",
            [req.params.commentId]
          );
          if (
            !("content" in req.body) ||
            !comment ||
            (comment.authorId !== req.session.userId && !req.session.admin)
          )
            return res.sendStatus(comment && "content" in req.body ? 400 : 401);

          await db.execute(
            "UPDATE comments SET content = ? WHERE commentId = ?",
            [req.body.content, req.params.commentId]
          );

          res.sendStatus(200);

          const [[post]] = await db.execute<IPost[]>(
            "SELECT postType, title FROM posts WHERE postId = ?",
            [comment.postId]
          );

          emitWebhookEvent(WebhookEvent.CommentEdit, {
            postId: comment.postId,
            commentId: parseInt(req.params.commentId),
            url: `/${getPostBasePathByType(post.postType)}/${
              comment.postId
            }/${encodeURIComponent(
              post.title!.replace(/\s+/g, "-").toLowerCase()
            )}#comment-${req.params.commentId}`,
            authorId: comment.authorId,
            authorName: comment.authorName
          });
        });

        router.post("/delete-comment/:commentId", async (req, res) => {
          const [[comment]] = await db.execute<IComment[]>(
            "SELECT author AS authorId, username AS authorName, postId FROM comments LEFT JOIN users ON userId = author WHERE commentId = ?",
            [req.params.commentId]
          );

          if (
            !comment ||
            (comment.authorId !== req.session.userId &&
              !(req.session.admin || req.session.moderator))
          )
            res.sendStatus(comment ? 401 : 400);

          await db.execute("DELETE FROM comments WHERE commentId = ?", [
            req.params.commentId
          ]);

          res.sendStatus(200);

          const [[post]] = await db.execute<IPost[]>(
            "SELECT postType, title FROM posts WHERE postId = ?",
            [comment.postId]
          );

          emitWebhookEvent(WebhookEvent.CommentDelete, {
            postId: comment.postId,
            commentId: parseInt(req.params.commentId),
            url: `/${getPostBasePathByType(post.postType)}/${
              comment.postId
            }/${encodeURIComponent(
              post.title!.replace(/\s+/g, "-").toLowerCase()
            )}#comment-${req.params.commentId}`,
            authorId: comment.authorId,
            authorName: comment.authorName
          });
        });

        router.post("/react", async (req, res) => {
          if (!req.session.loggedIn) return res.status(401).send();
          if (!["emoji", "target", "targetType"].every((k) => k in req.body))
            return res.status(400).send();

          if ("remove" in req.body && req.body.remove) {
            await db.execute(
              "DELETE FROM reactions WHERE emoji = ? AND userId = ? AND target = ? AND targetIsPost = ?",
              [
                req.body.emoji,
                req.session.userId,
                req.body.target,
                req.body.targetType === "post"
              ]
            );
          } else {
            const [[{ numReactions }]] = await db.execute<
              ({ numReactions: number } & RowDataPacket)[]
            >(
              "SELECT COUNT(emoji) as numReactions FROM reactions WHERE userId = ? AND target =? AND targetIsPost = ?",
              [
                req.session.userId,
                req.body.target,
                req.body.targetType === "post"
              ]
            );
            if (numReactions < 10)
              await db.execute(
                "INSERT IGNORE INTO reactions (emoji, userId, target, targetIsPost) VALUES(?, ?, ?, ?)",
                [
                  req.body.emoji,
                  req.session.userId,
                  req.body.target,
                  req.body.targetType === "post"
                ]
              );
            else return res.status(400).send();
          }
          res.status(200).send();
        });

        router.post("/answer/:postId", async (req, res) => {
          if (!("commentId" in req.body)) return res.sendStatus(400);

          const [[post]] = await db.execute<IPost[]>(
            "SELECT author AS authorId, username AS authorName, plainText, title, postType FROM posts LEFT JOIN users ON author = userId WHERE postId = ?",
            [req.params.postId]
          );

          if (
            !post ||
            !(
              req.session.admin ||
              req.session.moderator ||
              req.session.userId === post.authorId
            )
          )
            return res.sendStatus(post ? 401 : 400);

          await db.execute("UPDATE posts SET answeredBy = ? WHERE postId = ?", [
            req.body.commentId,
            req.params.postId
          ]);

          res.sendStatus(200);

          emitWebhookEvent(WebhookEvent.PostAnswer, {
            postId: parseInt(req.params.postId),
            title: post.title,
            url: `/${getPostBasePathByType(post.postType)}/${
              post.postId
            }/${encodeURIComponent(
              post.title.replace(/\s+/g, "-").toLowerCase()
            )}#comment-${req.body.commentId}`,
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

export = moduleDef;
