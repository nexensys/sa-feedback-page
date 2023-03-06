import useSWR from "swr";
import { Post, PostType } from "../common/types";
import style from "@styles/PostsPreview.module.css";
import { useContext, useState } from "react";
import Pagnation from "../components/Pagnation";
import { PostPreview } from "../components/PostsPreview";
import { TagsContext } from "../components/PostsContainer";
import Head from "next/head";

const FAQ: React.FC = () => {
  const [postsPerPage, setPostsPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const { data, error, isLoading } = useSWR<Post[]>(
    `/postapi/posts?postType=${
      PostType.Search
    }&sortBy=tag&tag=1&limit=${postsPerPage}&offset=${
      (page - 1) * postsPerPage
    }`,
    (url) => fetch(url).then((res) => res.json())
  );
  const tags = useContext(TagsContext);

  return (
    <>
      <Head>
        <title>FAQ - Scratch Addons Feedback</title>
      </Head>
      <div className={style.controlscontainer}>
        <div className={style.controls}>
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
            : (data?.length ?? 0) > 0
            ? data?.map((p) => (
                <PostPreview
                  key={p.postId}
                  postType={p.postType}
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

export default FAQ;
