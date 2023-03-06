import { HotModule } from "@upvotr/node-hmr";
import { Router, json } from "express";
import { appSession } from "./session";
import { IPost, ITagDefinition, db } from "./mysql";
import { WebhookEvent, emitWebhookEvent } from "./webHooks";
import { generateQuery, postsQueryFrom } from "../common/postQuery";
import { getPostBasePathByType } from "../common/types";

const moduleDef: HotModule<{}, Router> = {
  getPersistentValues() {
    return {};
  },
  cleanupPersistentValues() {},
  run() {
    const router = Router();

    router.use(appSession, json(), (req, res, next) => {
      if (!(req.session.moderator || req.session.admin))
        return res.sendStatus(401);
      next();
    });

    router.post("/:postId/add-tag", async (req, res) => {
      if (!("tagId" in req.body)) return res.sendStatus(400);

      const [[tag]] = await db.execute<
        (ITagDefinition & {
          private: boolean;
        })[]
      >(
        "SELECT tagName, bgColor, textColor, private FROM tagDefinitions WHERE tagId = ?",
        [req.body.tagId]
      );

      if (!tag) res.sendStatus(400);

      await db.execute("INSERT IGNORE INTO tags(tagId, postId) VALUES(?, ?)", [
        req.body.tagId,
        req.params.postId
      ]);

      res.sendStatus(200);

      emitWebhookEvent(WebhookEvent.TagAdd, {
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
      if (!("tagId" in req.body)) return res.sendStatus(400);

      const [[tag]] = await db.execute<
        (ITagDefinition & {
          private: boolean;
        })[]
      >(
        "SELECT tagName, bgColor, textColor, private FROM tagDefinitions WHERE tagId = ?",
        [req.body.tagId]
      );

      if (!tag) res.sendStatus(400);

      await db.execute("DELETE FROM tags WHERE postId = ? AND tagId = ?", [
        req.params.postId,
        req.body.tagId
      ]);

      res.sendStatus(200);

      emitWebhookEvent(WebhookEvent.TagRemove, {
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
      await db.execute("UPDATE posts SET public = TRUE WHERE postId = ?", [
        req.params.postId
      ]);

      res.sendStatus(200);

      const [[post]] = await db.execute<IPost[]>(
        generateQuery(
          ["postType", "title", "author as authorId", "plainText", "p.postId"],
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

      emitWebhookEvent(WebhookEvent.PostPublicized, {
        postId: post.postId,
        title: post.title,
        url: `/${getPostBasePathByType(post.postType)}/${
          post.postId
        }/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
        authorId: post.authorId,
        authorName: post.authorName,
        previewSnippet: post.plainText.slice(0, 100)
      });
    });

    router.post("/private/:postId", async (req, res) => {
      await db.execute("UPDATE posts SET public = FALSE WHERE postId = ?", [
        req.params.postId
      ]);

      res.sendStatus(200);

      const [[post]] = await db.execute<IPost[]>(
        generateQuery(
          ["postType", "title", "author as authorId", "plainText", "p.postId"],
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

      emitWebhookEvent(WebhookEvent.PostHidden, {
        postId: post.postId,
        title: post.title,
        url: `/${getPostBasePathByType(post.postType)}/${
          post.postId
        }/${encodeURIComponent(post.title.replace(/\s+/g, "-").toLowerCase())}`,
        authorId: post.authorId,
        authorName: post.authorName,
        previewSnippet: post.plainText.slice(0, 100)
      });
    });

    return router;
  },
  cleanup() {}
};

export = moduleDef;
