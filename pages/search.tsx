import { PostType } from "../common/types";
import PostsPreview from "./[postType]";

const Search: React.FC = () => <PostsPreview postType={PostType.Search} />;

export default Search;
