import session from "express-session";
import { SessionStore } from "./mysql";
import signature from "cookie-signature";

export const sessionStore = new SessionStore();

const twoWeeks =
  2 /*wk*/ * 7 /*day*/ * 24 /*hr*/ * 60 /*min*/ * 60 /*sec*/ * 1000; /*ms*/

export const appSession = session({
  secret: process.env.SECRET!,
  cookie: {
    maxAge: twoWeeks,
    httpOnly: true,
    secure: "auto", // todo: Change to true for production
    sameSite: "strict"
  },
  name: "session",
  rolling: true,
  saveUninitialized: false,
  resave: true,
  store: sessionStore
});

export function unsigncookie(val: string, secrets: string[]) {
  for (let i = 0; i < secrets.length; i++) {
    const result = signature.unsign(val, secrets[i]);

    if (result !== false) {
      return result;
    }
  }

  return false;
}
