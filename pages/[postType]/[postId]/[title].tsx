import { GetServerSideProps } from "next";
import { IComment, IPost, SessionStore, db } from "../../../server/mysql";
import sspLoadDB from "@common/sspLoadDB";
import { getPostBasePathByType } from "@common/types";
import PostComponent from "@components/Post";
import postQuery, { commentsQuery, generateQuery } from "@common/postQuery";
import { unsigncookie } from "../../../server/session";
import { SessionData } from "express-session";
import { postsQueryFrom } from "@common/postQuery";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (
    !["suggestions", "bugs", "questions"].includes(
      ctx.params!.postType as string
    )
  )
    return {
      notFound: true
    };
  const postId = parseInt(ctx.params!.postId as string);
  await sspLoadDB();

  const sessionCookie = ctx.req.cookies.session;
  const sessionId = sessionCookie?.startsWith("s:")
    ? unsigncookie(sessionCookie.slice(2), [process.env.SECRET!])
    : null;
  const session = sessionId
    ? await new Promise<SessionData | null | undefined>((resolve, reject) => {
        new SessionStore().get(sessionId, (err, session) => {
          if (err) reject(err);
          else resolve(session);
        });
      })
    : null;

  const [[post]] = await db.execute<IPost[]>(
    generateQuery(
      [
        "p.title",
        "p.content",
        "p.posted",
        "p.postType",
        "p.postId",
        "p.author AS authorId",
        "p.answeredBy",
        "p.lastEdit",
        "p.public"
      ],
      true,
      !!(session?.admin || session?.moderator),
      true,
      true,
      true,
      postsQueryFrom,
      `p.postId = ? AND (public = TRUE OR ? = TRUE)
      GROUP BY p.postId`,
      false
    ),
    [postId, !!(session?.moderator || session?.admin)]
  );
  if (!post)
    return {
      notFound: true
    };
  const { title, postType } = post;
  if (getPostBasePathByType(postType) !== ctx.params!.postType) {
    return {
      redirect: {
        permanent: true,
        destination: `/${getPostBasePathByType(
          postType
        )}/${postId}/${encodeURIComponent(
          title.replace(/\s+/g, "-").toLowerCase()
        )}`
      }
    };
  }
  if (
    decodeURIComponent(title.replace(/\s+/g, "-")).toLowerCase() !==
    ctx.params!.title
  )
    return {
      redirect: {
        permanent: true,
        destination: `/${getPostBasePathByType(
          postType
        )}/${postId}/${encodeURIComponent(
          title.replace(/\s+/g, "-").toLowerCase()
        )}`
      }
    };
  const [comments] = await db.execute<IComment[]>(commentsQuery, [post.postId]);

  return {
    props: {
      post: {
        ...post,
        postId,
        posted: post.posted.toString(),
        lastEdit: post.lastEdit?.toString() ?? null
      },
      comments: comments.map((c) => ({ ...c, posted: c.posted.toString() }))
    }
  };
};

export default PostComponent;
