import { Router } from "express";
import { v1 } from "uuid";
import { INotification, IUserSession, db } from "./mysql";
import { HotModule } from "@upvotr/node-hmr";

const moduleDef: HotModule<
  {},
  Router & {
    createNotification: ((
      title: string,
      content: string,
      link: string,
      userId: string
    ) => string[]) & {
      query: string;
    };
  }
> = {
  getPersistentValues() {
    return {};
  },
  cleanupPersistentValues() {},
  run() {
    const router = Router();

    router.get("/", async (req, res) => {
      if (!req.session.loggedIn) return res.json([]);
      const [notifications] = await db.execute<INotification[]>(
        "SELECT * FROM notifications WHERE targetedUser = ?",
        [req.session.userId]
      );

      res.json(notifications || []);
    });

    router.get("/hasunread", async (req, res) => {
      const [[user]] = await db.execute<IUserSession[]>(
        `SELECT
      (SELECT COUNT(uuid) > 0 FROM notifications WHERE targetedUser = ? AND viewed = FALSE) AS hasUnreadNotifications
    FROM users WHERE username = ?`,
        [req.session.userId || null, req.session.userId || null]
      );

      res.status(200).json({
        hasUnreadNotifications: user?.hasUnreadNotifications || false
      });
    });

    router.post("/read", async (req, res) => {
      if (!req.session.loggedIn) return res.status(401).send();

      if ("notification" in req.body) {
        await db.execute(
          "UPDATE notifications SET viewed = TRUE WHERE uuid = ? AND targetedUser = ?",
          [req.body.notification, req.session.userId]
        );
      } else {
        await db.execute(
          "UPDATE notifications SET viewed = TRUE WHERE targetedUser = ?",
          [req.session.userId]
        );
      }
      res.status(200).send();
    });

    router.post("/remove", async (req, res) => {
      if (!req.session.loggedIn) return res.status(401).send();

      if ("notification" in req.body) {
        await db.execute(
          "DELETE FROM notifications WHERE uuid = ? AND targetedUser = ?",
          [req.body.notification, req.session.userId]
        );
      } else {
        await db.execute("DELETE FROM notifications WHERE targetedUser = ?", [
          req.session.userId
        ]);
      }

      res.status(200).send();
    });

    const createNotification = Object.assign(
      (title: string, content: string, link: string, userId: string) => {
        return [title, content, link, v1(), userId];
      },
      {
        query:
          "INSERT INTO notifications (title, content, link, uuid, targetedUser) VALUES(?, ?, ?, ?, ?)"
      }
    );

    return Object.assign(router, {
      createNotification
    });
  },
  cleanup() {}
};

export = moduleDef;
