"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = exports.setup = exports.connect = exports.reconnect = exports.db = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const mysql_login_secret_json_1 = __importDefault(require("./mysql-login.secret.json"));
const util_1 = require("../common/util");
const express_session_1 = __importDefault(require("express-session"));
let dbPromise = promise_1.default.createConnection({
    host: "127.0.0.1",
    ...mysql_login_secret_json_1.default,
    multipleStatements: true
});
let connectPromise = connect();
function reconnect() {
    dbPromise = promise_1.default.createConnection({
        host: "127.0.0.1",
        ...mysql_login_secret_json_1.default,
        multipleStatements: true
    });
    connectPromise = connect();
}
exports.reconnect = reconnect;
/**
 * Make sure the main database is set up, and `USE` it.
 */
async function ensureAndUseDatabase() {
    const databaseName = "upvotr"; //! Do NOT base this on any sort of user input.
    await exports.db.execute(`CREATE DATABASE IF NOT EXISTS ${databaseName}`);
    await exports.db.query(`USE ${databaseName}`);
}
/**
 * Make sure a table exists. Should **NOT** be based on any sort of user input without thourough sanitization.
 * @param name The name of the table.
 * @param defs The table column definitions.
 */
async function ensureTable(name, defs) {
    await exports.db.execute(`CREATE TABLE IF NOT EXISTS ${name} (${defs.join(", ")})`);
}
async function connect() {
    exports.db = await dbPromise;
    await ensureAndUseDatabase();
}
exports.connect = connect;
async function setup() {
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
    await exports.db.query("INSERT IGNORE INTO users (username, avatarUrl, anonymous, userId) VALUES(?, ?, ?, ?)", ["Guest", "/images/default_user.png", false, "0"]);
    await ensureTable("sessions", [
        "data JSON NOT NULL",
        "sid CHAR(32) NOT NULL",
        "expires TIMESTAMP",
        "PRIMARY KEY (sid)"
    ]);
    await exports.db.query(`
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
    await exports.db.query("INSERT IGNORE INTO tagDefinitions (tagId, tagName) VALUES(1, 'Frequently Asked')");
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
exports.setup = setup;
class SessionStore extends express_session_1.default.Store {
    get execute() {
        return exports.db.execute;
    }
    get query() {
        return exports.db.query;
    }
    async get(sid, callback) {
        try {
            if (!exports.db)
                await connectPromise;
            const [rows] = await exports.db.execute("SELECT data, expires FROM sessions WHERE sid = ?", [sid]);
            if (!rows[0])
                return callback(null, null);
            if (rows[0]?.expires.getTime() < Date.now())
                return callback(null, null);
            callback(null, rows[0].data);
        }
        catch (e) {
            callback(e);
        }
    }
    async set(sid, session, callback) {
        let expires = session.cookie.expires;
        if (!expires) {
            expires = new Date(Date.now() + SessionStore.sessionTTL);
        }
        try {
            if (!sid)
                throw "Invalid session ID";
            if (!exports.db)
                await connectPromise;
            await exports.db.execute("INSERT INTO sessions (data, sid, expires) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)", [(0, util_1.omit)(session, []), sid, expires]);
            callback?.();
        }
        catch (e) {
            callback?.(e);
        }
    }
    async touch(sid, session, callback) {
        let expires = new Date(Date.now() + SessionStore.sessionTTL);
        try {
            if (!exports.db)
                await connectPromise;
            await exports.db.execute("UPDATE sessions SET expires = ? WHERE sid = ?", [
                expires,
                sid
            ]);
        }
        finally {
            callback?.();
        }
    }
    async destroy(sid, callback) {
        try {
            await exports.db.execute("DELETE FROM sessions WHERE sid = ?", [sid]);
            callback?.();
        }
        catch (e) {
            callback?.(e);
        }
    }
    async length(callback) {
        try {
            const [rows] = await exports.db.execute("SELECT COUNT(*) AS sessionCount FROM sessions WHERE expires >= ?", [new Date()]);
            callback(null, rows[0]?.sessionCount || 0);
        }
        catch (e) {
            callback(e, 0);
        }
    }
    async all(callback) {
        try {
            const [rows] = await exports.db.execute("SELECT * FROM sessions WHERE expires >= ?", [new Date()]);
            callback(null, Object.fromEntries(rows.map((row) => [row.sid, row.data])));
        }
        catch (e) {
            callback(e);
        }
    }
    async clear(callback) {
        try {
            await exports.db.execute("DELETE FROM sessions");
            callback?.();
        }
        catch (e) {
            callback?.(e);
        }
    }
}
exports.SessionStore = SessionStore;
(function (SessionStore) {
    SessionStore.sessionTTL = 1206900; // Two weeks
})(SessionStore = exports.SessionStore || (exports.SessionStore = {}));
//# sourceMappingURL=mysql.js.map