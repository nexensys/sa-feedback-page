import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="Suggestions, bug reports, and help system for Scratch Addons"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

declare module "express-session" {
  interface SessionData {
    loggedIn: boolean;
    userId: string;
    admin: boolean;
    moderator: boolean;
  }
}
