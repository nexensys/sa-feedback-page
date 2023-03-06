import style from "@styles/Recents.module.css";
import useSWR, { useSWRConfig } from "swr";
import { Post, getPostBasePathByType } from "../common/types";
import { Icon } from "@iconify/react";
import { buttonProps } from "../common/util";
import { useContext, useMemo } from "react";
import { TagsContext } from "./PostsContainer";
import { useRouter } from "next/router";
import Link from "next/link";

const Preview: React.FC<{ post: Post }> = ({ post }) => {
  const creationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-us", {
        dateStyle: "medium"
      }).format(new Date(post.posted)),
    [post.posted]
  );
  const tags = useContext(TagsContext);
  return (
    <Link
      href={`/${getPostBasePathByType(post.postType)}/${
        post.postId
      }/${encodeURIComponent(post.title.replace(/\s+/, "-").toLowerCase())}`}
      className={style.preview}
    >
      <div
        className={style.postvotes}
        style={{
          color: post.votes < 0 ? "red" : "inherit"
        }}
      >
        {post.votes >= 0 ? (
          <Icon icon="material-symbols:keyboard-arrow-up-rounded" />
        ) : null}
        <p>{post.votes}</p>
        {post.votes < 0 ? (
          <Icon icon="material-symbols:keyboard-arrow-down-rounded" />
        ) : null}
        {post.answeredBy !== null ? (
          <div className={style.answer} title="Answered">
            <Icon icon="uil:check-circle" />
          </div>
        ) : null}
      </div>
      <div className={style.postcontent}>
        <h4>{post.title}</h4>
        <p>
          Created by {post.authorName} on {creationDate}
        </p>
        {post.tags.length > 0 ? (
          <div className={style.posttags}>
            {post.tags
              .filter(
                (tag) => tags.findIndex((tdef) => tdef.tagId === tag) >= 0
              )
              .map((t) => {
                const tagDef = tags.find((tdef) => tdef.tagId === t)!;
                return (
                  <p
                    key={tagDef.tagName}
                    style={{
                      color: tagDef.textColor
                        ? `#${tagDef.textColor}`
                        : "white",
                      backgroundColor: tagDef.bgColor
                        ? `#${tagDef.bgColor}`
                        : "rgb(var(--accent-rgb))"
                    }}
                  >
                    {tagDef.tagName}
                  </p>
                );
              })}
          </div>
        ) : null}
      </div>
    </Link>
  );
};

const Recents: React.FC = () => {
  const { data, isLoading, error } = useSWR<Post[]>("/postapi/recent", (url) =>
    fetch(url).then((res) => res.json())
  );
  const { mutate } = useSWRConfig();
  const router = useRouter();
  return router.pathname !== "/admin" ? (
    <div className={style.wrapper}>
      <div className={style.header}>
        <h3>Recent posts</h3>
        <div
          className={style.refresh}
          title="Refresh"
          {...buttonProps(() => mutate("/postapi/recent"))}
        >
          <Icon icon="lucide:refresh-cw" />
        </div>
      </div>
      <div className={style.seperator} />
      <div className={style.postpreviews}>
        {data?.map((post) => (
          <Preview post={post} key={post.postId} />
        ))}
      </div>
    </div>
  ) : null;
};

export default Recents;
