import { GetServerSideProps } from "next";
import { unsigncookie } from "../server/session";
import sspLoadDB from "../common/sspLoadDB";
import { IUserData, SessionStore, db } from "../server/mysql";
import { SessionData } from "express-session";
import AccountSettings from "../components/AccountSettings";

declare module "express-session" {
  interface SessionData {
    loggedIn: boolean;
    userId: string;
    admin: boolean;
    moderator: boolean;
  }
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const sessionCookie = ctx.req.cookies.session;
  const sessionId = sessionCookie?.startsWith("s:")
    ? unsigncookie(sessionCookie.slice(2), [process.env.SECRET!])
    : null;
  if (!sessionId)
    return {
      notFound: true
    };

  await sspLoadDB();
  const session = await new Promise<SessionData | null | undefined>(
    (resolve, reject) => {
      new SessionStore().get(sessionId, (err, session) => {
        if (err) reject(err);
        else resolve(session);
      });
    }
  );

  if (!(session && session.loggedIn))
    return {
      notFound: true
    };

  const [[user]] = await db.execute<IUserData[]>(
    "SELECT anonymous FROM users WHERE userId = ?",
    [session.userId]
  );

  return {
    props: {
      anonymous: user.anonymous
    }
  };
};

export default AccountSettings;
