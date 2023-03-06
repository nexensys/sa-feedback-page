"use strict";
const express_1 = require("express");
const uuid_1 = require("uuid");
const mysql_1 = require("./mysql");
const moduleDef = {
    getPersistentValues() {
        return {};
    },
    cleanupPersistentValues() { },
    run() {
        const router = (0, express_1.Router)();
        router.get("/", async (req, res) => {
            if (!req.session.loggedIn)
                return res.json([]);
            const [notifications] = await mysql_1.db.execute("SELECT * FROM notifications WHERE targetedUser = ?", [req.session.userId]);
            res.json(notifications || []);
        });
        router.get("/hasunread", async (req, res) => {
            const [[user]] = await mysql_1.db.execute(`SELECT
      (SELECT COUNT(uuid) > 0 FROM notifications WHERE targetedUser = ? AND viewed = FALSE) AS hasUnreadNotifications
    FROM users WHERE username = ?`, [req.session.userId || null, req.session.userId || null]);
            res.status(200).json({
                hasUnreadNotifications: user?.hasUnreadNotifications || false
            });
        });
        router.post("/read", async (req, res) => {
            if (!req.session.loggedIn)
                return res.status(401).send();
            if ("notification" in req.body) {
                await mysql_1.db.execute("UPDATE notifications SET viewed = TRUE WHERE uuid = ? AND targetedUser = ?", [req.body.notification, req.session.userId]);
            }
            else {
                await mysql_1.db.execute("UPDATE notifications SET viewed = TRUE WHERE targetedUser = ?", [req.session.userId]);
            }
            res.status(200).send();
        });
        router.post("/remove", async (req, res) => {
            if (!req.session.loggedIn)
                return res.status(401).send();
            if ("notification" in req.body) {
                await mysql_1.db.execute("DELETE FROM notifications WHERE uuid = ? AND targetedUser = ?", [req.body.notification, req.session.userId]);
            }
            else {
                await mysql_1.db.execute("DELETE FROM notifications WHERE targetedUser = ?", [
                    req.session.userId
                ]);
            }
            res.status(200).send();
        });
        const createNotification = Object.assign((title, content, link, userId) => {
            return [title, content, link, (0, uuid_1.v1)(), userId];
        }, {
            query: "INSERT INTO notifications (title, content, link, uuid, targetedUser) VALUES(?, ?, ?, ?, ?)"
        });
        return Object.assign(router, {
            createNotification
        });
    },
    cleanup() { }
};
module.exports = moduleDef;
//# sourceMappingURL=notificationsRouter.js.map