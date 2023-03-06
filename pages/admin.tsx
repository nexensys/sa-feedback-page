import { GetServerSideProps } from "next";
import { unsigncookie } from "../server/session";
import sspLoadDB from "../common/sspLoadDB";
import { SessionStore } from "../server/mysql";
import { SessionData } from "express-session";
import AdminPanel from "../components/AdminPanel";

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

  if (!(session && session.loggedIn && session.admin))
    return {
      notFound: true
    };

  return {
    props: {}
  };
};

export default AdminPanel;
