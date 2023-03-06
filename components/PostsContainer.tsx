import style from "@styles/PostsContainer.module.css";
import Tabs from "./Tabs";
import { createContext } from "react";
import { PostTag } from "../common/types";
import useSWR from "swr";
import Recents from "./Recents";

export const TagsContext = createContext<PostTag[]>([]);

const PostsContainer: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { data: fetchedTags } = useSWR<PostTag[]>("/postapi/tags", (url) =>
    fetch(url).then((res) => res.json())
  );
  const tags: PostTag[] = fetchedTags || [];

  return (
    <div className={style.postscontainer}>
      <Tabs />
      <TagsContext.Provider value={tags}>
        <div className={style.postscontent}>{children}</div>
        <Recents />
      </TagsContext.Provider>
    </div>
  );
};

export default PostsContainer;
