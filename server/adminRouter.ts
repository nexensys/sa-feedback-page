import { Router, json } from "express";
import { appSession, sessionStore } from "./session";
import { IPost, IUserData, IWebhook, db } from "./mysql";
import { HotModule } from "@upvotr/node-hmr";
import {
  authorNameQuery,
  generateQuery,
  postsQueryFrom
} from "../common/postQuery";
import { Post, PostType, getPostBasePathByType } from "../common/types";
import createJITI from "jiti";
import { WebhookEvent, addWebhook, emitWebhookEvent } from "./webHooks";

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

const moduleDef: HotModule<{}, Router> = {
  getPersistentValues() {
    return {};
  },
  cleanupPersistentValues() {},
  run(persistentValues, emitUpdate) {
    const router = Router();

    router.use(
      appSession,
      (req, res, next) => {
        if (!req.session.admin) res.sendStatus(401);
        else next();
      },
      json()
    );

    router.post("/add-tag", async (req, res) => {
      if (!("tagName" in req.body)) return res.sendStatus(400);

      await db.execute(
        "INSERT INTO tagDefinitions (tagName, bgColor, textColor, private) VALUES(?, ?, ?, ?)",
        [
          req.body.tagName,
          req.body.bgColor ?? null,
          req.body.textColor ?? null,
          !!req.body.private
        ]
      );

      res.sendStatus(200);
    });

    router.post("/delete-tag", async (req, res) => {
      if (!("tagId" in req.body)) return res.sendStatus(400);

      await db.execute("DELETE FROM tagDefinitions WHERE tagId = ?", [
        req.body.tagId
      ]);
      await db.execute("DELETE FROM tags WHERE tagId = ?", [req.body.tagId]);

      res.sendStatus(200);
    });

    router.post("/change-tag", async (req, res) => {
      if (!("tagId" in req.body)) return res.sendStatus(400);

      await db.execute(
        `UPDATE tagDefinitions SET
        tagName = COALESCE(?, tagName),
        bgColor = ?,
        textColor = ?,
        private = COALESCE(?, FALSE)
      WHERE tagId = ?`,
        [
          req.body.tagName ?? null,
          req.body.bgColor ?? null,
          req.body.textColor ?? null,
          req.body.private ?? null,
          req.body.tagId
        ]
      );

      res.sendStatus(200);
    });

    router.get("/admins", async (req, res) => {
      const [admins] = await db.query<IUserData[]>(
        "SELECT username, userId, admin, moderator FROM users WHERE admin IS TRUE"
      );

      res.json(admins);
    });

    router.get("/moderators", async (req, res) => {
      const [moderators] = await db.query<IUserData[]>(
        "SELECT username, userId, admin, moderator FROM users WHERE moderator IS TRUE"
      );

      res.json(moderators);
    });

    router.get("/users", async (req, res) => {
      const usersPerPage = parseInt(req.query.perPage as string) || 0;
      const offset = parseInt(req.query.offset as string) || 0;
      const [users] = await db.execute<IUserData[]>(
        "SELECT username, userId, admin, moderator FROM users WHERE userId != '0' LIMIT ? OFFSET ?",
        [usersPerPage.toString(), offset.toString()]
      );

      res.json(users);
    });

    router.get("/userslist", async (req, res) => {
      const [users] = await db.query<IUserData[]>(
        "SELECT username, userId FROM users"
      );

      res.json(users);
    });

    router.post("/change-user", async (req, res) => {
      if (!("userId" in req.body)) return res.sendStatus(400);

      await db.execute(
        "UPDATE users SET admin = COALESCE(?, admin), moderator = COALESCE(?, moderator) WHERE userId = ?",
        [req.body.admin ?? null, req.body.moderator ?? null, req.body.userId]
      );

      res.sendStatus(200);
    });

    router.post("/delete-user", async (req, res) => {
      if (!("userId" in req.body)) return res.sendStatus(400);

      await db.execute("DELETE FROM users WHERE userId = ?", [req.body.userId]);

      sessionStore.all((err, obj) => {
        if (err) return;
        for (const sid in obj) {
          sessionStore.destroy(sid);
        }
      });

      res.sendStatus(200);
    });

    router.get("/manage-posts", async (req, res) => {
      const usersPerPage = parseInt(req.query.perPage as string) || 0;
      const offset = (parseInt(req.query.offset as string) || 0) * usersPerPage;

      const [posts] = await db.execute<IPost[]>(
        generateQuery(
          [
            "p.title",
            "p.posted",
            "p.content",
            "p.postType",
            "p.postId",
            "p.author AS authorId"
          ],
          true,
          true,
          true,
          true,
          false,
          postsQueryFrom,
          `GROUP BY p.postId
          LIMIT ? OFFSET ?`,
          true
        ),
        [usersPerPage.toString(), offset.toString()]
      );

      res.json(posts);
    });

    router.post("/edit-post", async (req, res) => {
      if (!("postId" in req.body)) return res.sendStatus(400);

      const postData: Partial<Post> = {
        title: req.body.title,
        content: req.body.content,
        postType: req.body.postType as PostType,
        plainText:
          req.body.content &&
          toString(
            fromMarkdown(req.body.content, {
              extensions: [gfm()],
              mdastExtensions: [gfmFromMarkdown()]
            })
          ),
        authorId: req.body.authorId
      };

      await db.execute(
        `UPDATE posts SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        postType = COALESCE(?, postType),
        plainText = COALESCE(?, plainText),
        author = COALESCE(?, author)
      WHERE postId = ?`,
        [
          postData.title ?? null,
          postData.content ?? null,
          postData.postType ?? null,
          postData.plainText ?? null,
          postData.authorId ?? null,
          parseInt(req.body.postId)
        ]
      );

      res.sendStatus(200);

      const [[post]] = await db.execute<IPost[]>(
        generateQuery(
          ["postType", "title", "author as authorId", "plainText"],
          false,
          false,
          true,
          false,
          false,
          postsQueryFrom,
          "p.postId = ?",
          false
        ),
        [req.body.postId]
      );

      emitWebhookEvent(WebhookEvent.PostEdit, {
        postId: req.body.postId,
        title: post.title,
        url: `/${getPostBasePathByType(req.body.postType)}/${
          req.body.postId
        }/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
        authorId: post.authorId,
        authorName: post.authorName,
        previewSnippet: post.plainText.slice(0, 100)
      });
    });

    router.post("/delete-post", async (req, res) => {
      if (!("postId" in req.body)) return res.sendStatus(400);

      const [[post]] = await db.execute<IPost[]>(
        generateQuery(
          ["postType", "title", "author as authorId", "plainText"],
          false,
          false,
          true,
          false,
          false,
          postsQueryFrom,
          "p.postId = ?",
          false
        ),
        [req.body.postId]
      );

      await db.execute(`DELETE FROM posts WHERE postId = ?`, [req.body.postId]);
      await db.execute(`DELETE FROM tags WHERE postId = ?`, [req.body.postId]);

      res.sendStatus(200);

      emitWebhookEvent(WebhookEvent.PostDelete, {
        postId: req.body.postId,
        title: post.title,
        url: `/${getPostBasePathByType(req.body.postType)}/${
          req.body.postId
        }/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
        authorId: post.authorId,
        authorName: post.authorName,
        previewSnippet: post.plainText.slice(0, 100)
      });
    });

    router.get("/webhooks", async (req, res) => {
      const [webhooks] = await db.query<IWebhook[]>(
        "SELECT eventType, requestURL, hookId FROM webhooks"
      );

      res.json(webhooks);
    });

    router.post("/add-webhook", async (req, res) => {
      if (!("event" in req.body && "url" in req.body))
        return res.sendStatus(400);

      addWebhook(req.body.event as WebhookEvent, req.body.url).then(
        () => res.sendStatus(200),
        () => res.sendStatus(400)
      );
    });

    router.post("/remove-webhook", async (req, res) => {
      if (!("hookId" in req.body)) return res.sendStatus(400);

      await db.execute("DELETE FROM webhooks WHERE hookId = ?", [
        req.body.hookId
      ]);

      res.sendStatus(200);
    });

    router.post("/edit-webhook", async (req, res) => {
      if (!("hookId" in req.body)) res.sendStatus(400);

      await db.execute(
        "UPDATE webhooks SET eventType = COALESCE(?, eventType), requestURL = COALESCE(?, requestURL) WHERE hookId = ?",
        [req.body.event ?? null, req.body.url ?? null, req.body.hookId]
      );

      res.sendStatus(200);
    });

    return router;
  },
  cleanup() {}
};

export = moduleDef;
