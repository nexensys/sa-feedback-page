import mysql, { RowDataPacket } from "mysql2/promise";
import login from "./mysql-login.secret.json";
import { omit } from "../common/util";
import { Comment, Post } from "../common/types";
import session from "express-session";
import { Webhook } from "./webHooks";

export let db: mysql.Connection;
let dbPromise = mysql.createConnection({
  host: "127.0.0.1",
  ...login,
  multipleStatements: true
});
let connectPromise = connect();

export function reconnect() {
  dbPromise = mysql.createConnection({
    host: "127.0.0.1",
    ...login,
    multipleStatements: true
  });
  connectPromise = connect();
}

/**
 * Make sure the main database is set up, and `USE` it.
 */
async function ensureAndUseDatabase() {
  const databaseName = "upvotr"; //! Do NOT base this on any sort of user input.
  await db.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
  await db.query(`USE ${databaseName}`);
}

/**
 * Make sure a table exists. Should **NOT** be based on any sort of user input without thourough sanitization.
 * @param name The name of the table.
 * @param defs The table column definitions.
 */
async function ensureTable(name: string, defs: string[]) {
  await db.execute(`CREATE TABLE IF NOT EXISTS ${name} (${defs.join(", ")})`);
}

export async function connect() {
  db = await dbPromise;
  await ensureAndUseDatabase();
}

export async function setup() {
  await connectPromise;

  await ensureTable("users", [
    "username CHAR(28) NOT NULL",
    "avatarUrl TEXT(300) NOT NULL",
    "anonymous BOOLEAN",
    "userId CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "admin BOOLEAN DEFAULT FALSE",
    "moderator BOOLEAN DEFAULT FALSE",
    "PRIMARY KEY (userId)"
  ]);

  await db.query(
    "INSERT IGNORE INTO users (username, avatarUrl, anonymous, userId) VALUES(?, ?, ?, ?)",
    ["Guest", "/images/default_user.png", false, "0"]
  );

  await ensureTable("sessions", [
    "data JSON NOT NULL",
    "sid CHAR(32) NOT NULL",
    "expires TIMESTAMP",
    "PRIMARY KEY (sid)"
  ]);

  await db.query(`
  CREATE EVENT IF NOT EXISTS
    clearExpiredSessions
  ON SCHEDULE EVERY 1 DAY
  DO
    DELETE FROM sessions
    WHERE expires < NOW()
  `);

  await ensureTable("notifications", [
    "title VARCHAR(200) NOT NULL",
    "content VARCHAR(200) NOT NULL",
    "link VARCHAR(100) NOT NULL",
    "sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "uuid CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "viewed BOOLEAN DEFAULT FALSE",
    "targetedUser CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "PRIMARY KEY (uuid)"
  ]);

  await ensureTable("posts", [
    "title VARCHAR(100) NOT NULL",
    "content MEDIUMTEXT NOT NULL",
    "posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "author CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "postId INT UNSIGNED NOT NULL AUTO_INCREMENT",
    "reactions JSON NOT NULL",
    "postType TINYINT UNSIGNED NOT NULL",
    "plainText MEDIUMTEXT NOT NULL",
    "answeredBy INT UNSIGNED",
    "lastEdit TIMESTAMP",
    "public BOOLEAN DEFAULT FALSE",
    "PRIMARY KEY (postId)"
  ]);

  await ensureTable("votes", [
    "postId INT UNSIGNED NOT NULL",
    "userId CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "vote BOOLEAN NOT NULL",
    "CONSTRAINT one_vote_per_post UNIQUE(postId, userId)"
  ]);

  await ensureTable("tagDefinitions", [
    "tagId INT UNSIGNED NOT NULL AUTO_INCREMENT",
    "tagName CHAR(30) NOT NULL",
    "bgColor VARCHAR(6)",
    "textColor VARCHAR(6)",
    "private BOOLEAN",
    "PRIMARY KEY (tagId)"
  ]);

  await db.query(
    "INSERT IGNORE INTO tagDefinitions (tagId, tagName) VALUES(1, 'Frequently Asked')"
  );

  await ensureTable("tags", [
    "tagId INT UNSIGNED NOT NULL",
    "postId INT UNSIGNED NOT NULL",
    "CONSTRAINT one_per_post UNIQUE(tagId, postId)"
  ]);

  await ensureTable("comments", [
    "content MEDIUMTEXT NOT NULL",
    "posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "author CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "postId INT UNSIGNED NOT NULL",
    "commentId INT UNSIGNED NOT NULL AUTO_INCREMENT",
    "repliesTo INT UNSIGNED",
    "PRIMARY KEY (commentId)"
  ]);

  await ensureTable("reactions", [
    "emoji VARCHAR(255) NOT NULL",
    "userId CHAR(36) CHARACTER SET utf8mb3 NOT NULL",
    "target INT UNSIGNED NOT NULL",
    "targetIsPost BOOLEAN NOT NULL",
    "PRIMARY KEY (userId, target, targetIsPost, emoji)"
  ]);

  await ensureTable("webhooks", [
    "eventType CHAR(25) NOT NULL",
    "requestURL TEXT NOT NULL",
    "hookId INT UNSIGNED NOT NULL AUTO_INCREMENT",
    "PRIMARY KEY(hookId)"
  ]);
}

export class SessionStore extends session.Store {
  get execute() {
    return db.execute;
  }
  get query() {
    return db.query;
  }

  async get(
    sid: string,
    callback: (
      err: any,
      session?: session.SessionData | null | undefined
    ) => void
  ) {
    try {
      if (!db) await connectPromise;
      const [rows] = await db.execute<SessionStore.ISession[]>(
        "SELECT data, expires FROM sessions WHERE sid = ?",
        [sid]
      );
      if (!rows[0]) return callback(null, null);
      if (rows[0]?.expires.getTime() < Date.now()) return callback(null, null);
      callback(null, rows[0].data);
    } catch (e) {
      callback(e);
    }
  }

  async set(
    sid: string,
    session: session.SessionData,
    callback?: ((err?: any) => void) | undefined
  ) {
    let expires = session.cookie.expires;
    if (!expires) {
      expires = new Date(Date.now() + SessionStore.sessionTTL);
    }

    try {
      if (!sid) throw "Invalid session ID";
      if (!db) await connectPromise;
      await db.execute(
        "INSERT INTO sessions (data, sid, expires) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)",
        [omit(session, []), sid, expires]
      );
      callback?.();
    } catch (e) {
      callback?.(e);
    }
  }

  async touch(
    sid: string,
    session: session.SessionData,
    callback?: (() => void) | undefined
  ) {
    let expires = new Date(Date.now() + SessionStore.sessionTTL);

    try {
      if (!db) await connectPromise;
      await db.execute("UPDATE sessions SET expires = ? WHERE sid = ?", [
        expires,
        sid
      ]);
    } finally {
      callback?.();
    }
  }

  async destroy(sid: string, callback?: ((err?: any) => void) | undefined) {
    try {
      await db.execute("DELETE FROM sessions WHERE sid = ?", [sid]);
      callback?.();
    } catch (e) {
      callback?.(e);
    }
  }

  async length(callback: (err: any, length: number) => void) {
    try {
      const [rows] = await db.execute<SessionStore.ISessionCount[]>(
        "SELECT COUNT(*) AS sessionCount FROM sessions WHERE expires >= ?",
        [new Date()]
      );
      callback(null, rows[0]?.sessionCount || 0);
    } catch (e) {
      callback(e, 0);
    }
  }

  async all(
    callback: (
      err: any,
      obj?: { [sid: string]: session.SessionData } | null | undefined
    ) => void
  ) {
    try {
      const [rows] = await db.execute<SessionStore.ISession[]>(
        "SELECT * FROM sessions WHERE expires >= ?",
        [new Date()]
      );
      callback(
        null,
        Object.fromEntries(rows.map((row) => [row.sid, row.data]))
      );
    } catch (e) {
      callback(e);
    }
  }

  async clear(callback?: ((err?: any) => void) | undefined) {
    try {
      await db.execute("DELETE FROM sessions");
      callback?.();
    } catch (e) {
      callback?.(e);
    }
  }
}

export namespace SessionStore {
  export interface ISession extends RowDataPacket {
    sid: string;
    data: session.SessionData;
    expires: Date;
  }
  export interface ISessionCount extends RowDataPacket {
    sessionCount: number;
  }
  export const sessionTTL = 1206900; // Two weeks
}

export interface IUserData extends RowDataPacket {
  username: string;
  lastOnline: Date;
  anonymous: boolean;
  avatarUrl: string;
  userId: string;
  admin: boolean;
  moderator: boolean;
}

export interface IUserSession extends RowDataPacket {
  username: string;
  lastOnline: Date;
  hasUnreadNotifications: boolean;
  anonymous: boolean;
  avatarUrl: string;
}

export interface INotification extends RowDataPacket {
  title: string;
  content: string;
  link: string;
  sent: Date;
  uuid: string;
  viewed: boolean;
  targetedUser: string;
}

export interface IPost extends Post, RowDataPacket {}

export interface ITagDefinition extends RowDataPacket {
  tagId: number;
  tagName: string;
  bgColor: string;
  textColor: string;
}

export interface ITag extends RowDataPacket {
  tagId: number;
  postId: number;
}

export interface IComment extends Comment, RowDataPacket {}

export interface IWebhook extends Webhook, RowDataPacket {}
