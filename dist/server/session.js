"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsigncookie = exports.appSession = exports.sessionStore = void 0;
const express_session_1 = __importDefault(require("express-session"));
const mysql_1 = require("./mysql");
const cookie_signature_1 = __importDefault(require("cookie-signature"));
exports.sessionStore = new mysql_1.SessionStore();
const twoWeeks = 2 /*wk*/ * 7 /*day*/ * 24 /*hr*/ * 60 /*min*/ * 60 /*sec*/ * 1000; /*ms*/
exports.appSession = (0, express_session_1.default)({
    secret: process.env.SECRET,
    cookie: {
        maxAge: twoWeeks,
        httpOnly: true,
        secure: "auto",
        sameSite: "strict"
    },
    name: "session",
    rolling: true,
    saveUninitialized: true,
    resave: true,
    store: exports.sessionStore
});
function unsigncookie(val, secrets) {
    for (let i = 0; i < secrets.length; i++) {
        const result = cookie_signature_1.default.unsign(val, secrets[i]);
        if (result !== false) {
            return result;
        }
    }
    return false;
}
exports.unsigncookie = unsigncookie;
//# sourceMappingURL=session.js.map