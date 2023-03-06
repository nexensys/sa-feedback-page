import { Post, PostType } from "../common/types";
import { useMemo, useState, useEffect, useContext } from "react";
import useSWR from "swr";
import style from "@styles/PostsPreview.module.css";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { TagsContext } from "./PostsContainer";
import Pagnation from "./Pagnation";
import Head from "next/head";

export const PostPreview: React.FC<{
  post: Post;
  postType: PostType;
  tags: {
    tagId: number;
    tagName: string;
    textColor: string | null;
    bgColor: string | null;
  }[];
}> = ({ post, postType, tags }) => {
  const creationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-us", {
        dateStyle: "medium"
      }).format(new Date(post.posted)),
    [post.posted]
  );

  return (
    <Link
      className={style.postpreview}
      href={`/${
        postType === PostType.Suggestion
          ? "suggestions"
          : postType === PostType.Question
          ? "questions"
          : "bugs"
      }/${post.postId}/${encodeURIComponent(
        post.title.replace(/\s+/, "-").toLowerCase()
      )}`}
    >
      <div className={style.postinfo}>
        <h2>{post.title}</h2>
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
    </Link>
  );
};

/*export const PostsPreviewList: React.FC<{ posts: Post[] }> = ({ posts }) => {

}*/

const PostsPreview: React.FC<{ postType: PostType }> = ({ postType }) => {
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "popular" | "tag" | string
  >("popular");
  const [sortTag, setSortTag] = useState<number>(0);
  const [postsPerPage, setPostsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [query, setQuery] = useState("");
  const [realQuery, setRealQuery] = useState("");
  const [queryRegex, setQueryRegex] = useState(false);
  const [queryRegexValid, setRegexValid] = useState(false);
  useEffect(() => {
    setPage(1);
  }, [postsPerPage]);
  const path = useMemo(
    () =>
      `/postapi/posts?postType=${postType}&sortBy=${sortBy}${
        sortBy === "tag" ? `&tag=${encodeURIComponent(sortTag!)}` : ""
      }&limit=${postsPerPage}&offset=${
        (page - 1) * postsPerPage
      }&query=${encodeURIComponent(realQuery)}&regex=${queryRegex ? 1 : 0}`,
    [sortBy, sortTag, postsPerPage, page, postType, realQuery, queryRegex]
  );
  const { data, error, isLoading } = useSWR<Post[]>(path, (url) =>
    fetch(url).then((res) => res.json())
  );
  useEffect(() => {
    if ((data as any)?.err === "Invalid Regex" && query === realQuery) {
      setRegexValid(false);
    }
  }, [data, query, realQuery, setRegexValid]);
  useEffect(() => {
    try {
      new RegExp(query);
      setRegexValid(
        !/[^\\]\{(?:(?:\d*,\s+\d*)|(?:\d*\s+,\d*)|(?:\d*\s+,\s+\d*))[^\\]\}/.test(
          query
        )
      );
    } catch {
      setRegexValid(false);
    }
  }, [query, setRegexValid, queryRegex]);
  useEffect(() => {
    if (query !== "") {
      const timeout = queryRegexValid
        ? setTimeout(() => {
            setRealQuery(query);
          }, 2 * 1000)
        : undefined;

      return () => clearTimeout(timeout);
    } else {
      setRealQuery("");
    }
  }, [query, setRealQuery, queryRegexValid]);

  const tags = useContext(TagsContext);
  return (
    <>
      <Head>
        <title>
          {postType === PostType.Suggestion
            ? "Suggestions"
            : postType === PostType.BugReport
            ? "Bug Reports"
            : postType === PostType.Question
            ? "Help & Questions"
            : "Search"}{" "}
          - Scratch Addons Feedback
        </title>
      </Head>
      <div className={style.controlscontainer}>
        <div className={style.controls}>
          <div className={style.sortcontrols}>
            <label className={style.dropdown}>
              <p>Sort by:</p>
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.currentTarget.value)}
                >
                  <option value="popular">Popular</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="tag">Tag</option>
                </select>
              </div>
            </label>
            {sortBy === "tag" ? (
              <label className={style.dropdown}>
                <p>Sort tag:</p>
                <div>
                  <select
                    value={sortTag}
                    onChange={(e) =>
                      setSortTag(parseInt(e.currentTarget.value))
                    }
                  >
                    <option value="0"> --Select tag-- </option>
                    {tags.map((tag) => (
                      <option value={tag.tagId.toString()} key={tag.tagId}>
                        {tag.tagName}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            ) : null}
          </div>
          <div className={style.searchcontrols}>
            <label className={style.searchlabel}>
              <p>Search:</p>
              <input
                className={style.search}
                placeholder="Search posts..."
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                aria-invalid={!queryRegexValid && queryRegex}
              />
            </label>
            <label className={style.regex}>
              <input
                type="checkbox"
                checked={queryRegex}
                onChange={(e) => setQueryRegex(e.currentTarget.checked)}
                onKeyDown={(e) => {
                  if (e.key.toLowerCase() !== "enter") return;
                  setQueryRegex(!e.currentTarget.checked);
                }}
              />
              <p>Regular Expression</p>
            </label>
          </div>
          <Pagnation
            allowedAmountsPerPage={[5, 10, 20, 50]}
            defaultPostsPerPage={10}
            onPageChange={(page, postsPerPage) => {
              setPage(page);
              setPostsPerPage(postsPerPage);
            }}
          />
        </div>
        <div className={style.postspreview}>
          {isLoading
            ? "Loading posts..."
            : error
            ? "Unable to load posts, reload to try again..."
            : "err" in (data || {}) && query === realQuery
            ? "Invalid Query!"
            : postType === PostType.Search
            ? query !== realQuery
              ? "Searching..."
              : (data?.length ?? 0) > 0
              ? data?.map((p) => (
                  <PostPreview
                    key={p.postId}
                    postType={postType}
                    post={p}
                    tags={tags}
                  />
                ))
              : "No posts yet!"
            : (data?.length ?? 0) > 0
            ? data?.map((p) => (
                <PostPreview
                  key={p.postId}
                  postType={postType}
                  post={p}
                  tags={tags}
                />
              ))
            : "No posts yet!"}
        </div>
      </div>
    </>
  );
};

export default PostsPreview;
