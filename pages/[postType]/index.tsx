import { GetServerSideProps } from "next";
import { PostType } from "../../common/types";
import PostsPreview from "../../components/PostsPreview";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (
    !["suggestions", "bugs", "questions"].includes(
      ctx.params!.postType as string
    )
  )
    return {
      notFound: true
    };

  return {
    props: {
      postType:
        ctx.params!.postType === "suggestions"
          ? PostType.Suggestion
          : ctx.params!.postType === "bugs"
          ? PostType.BugReport
          : PostType.Question
    }
  };
};

export default PostsPreview;
