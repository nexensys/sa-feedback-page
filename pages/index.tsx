import Head from "next/head";
import styles from "@styles/Home.module.css";
import React, { useMemo } from "react";
import { MdRoot } from "../components/mdcomponents";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { GetServerSideProps } from "next";
import { SessionStore } from "../server/mysql";
import { unsigncookie } from "../server/session";
import sspLoadDB from "../common/sspLoadDB";
import { SessionData } from "express-session";

import welcomeMessage from "../static-content/welcome.md";
import modWelcomeMessage from "../static-content/mod-welcome.md";
import adminWelcome from "../static-content/admin-welcome.md";

const Home: React.FC<{ welcomeMessage: string }> = ({ welcomeMessage }) => {
  const ast = useMemo(
    () =>
      fromMarkdown(welcomeMessage, {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()]
      }),
    [welcomeMessage]
  );
  return (
    <>
      <Head>
        <title>Welcome - Scratch Addons Feedback</title>
      </Head>
      <div className={styles.main}>
        <MdRoot root={ast} />
      </div>
    </>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const sessionCookie = req.cookies.session;
  const sessionId = sessionCookie?.startsWith("s:")
    ? unsigncookie(sessionCookie.slice(2), [process.env.SECRET!])
    : null;
  if (!sessionId)
    return {
      props: {
        welcomeMessage
      }
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

  return {
    props: {
      welcomeMessage: session?.admin
        ? adminWelcome
        : session?.moderator
        ? modWelcomeMessage
        : welcomeMessage
    }
  };
};
