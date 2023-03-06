"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEvent = exports.emitWebhookEvent = exports.addWebhook = void 0;
const mysql_1 = require("./mysql");
const types_1 = require("../common/types");
Object.defineProperty(exports, "WebhookEvent", { enumerable: true, get: function () { return types_1.WebhookEvent; } });
async function addWebhook(type, url) {
    if (!/^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/i.test(url))
        throw "Invalid URL";
    await mysql_1.db.execute("INSERT INTO webhooks(eventType, requestURL) VALUES(?, ?)", [
        type,
        url
    ]);
}
exports.addWebhook = addWebhook;
async function emitWebhookEvent(event, data) {
    const [webhooks] = await mysql_1.db.execute("SELECT requestURL FROM webhooks WHERE eventType = ?", [event]);
    webhooks.forEach(({ requestURL }) => {
        fetch(requestURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).catch();
    });
}
exports.emitWebhookEvent = emitWebhookEvent;
//# sourceMappingURL=webHooks.js.map