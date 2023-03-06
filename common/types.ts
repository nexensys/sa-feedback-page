export interface UserNotification {
  title: string;
  content: string;
  link: string;
  sent: Date;
  uuid: string;
  viewed: boolean;
  targetedUser: string;
}

export interface PostTag {
  tagId: number;
  tagName: string;
  textColor: string | null;
  bgColor: string | null;
  private: boolean;
}

export interface Reaction {
  user: string;
  type: string;
}

export interface PostResponse {
  id: string;
  author: {
    username: string;
    avatar: string;
  };
  respondsTo: string;
  content: string; // Markdown
  reactions: Reaction[];
}

export enum PostType {
  Suggestion,
  BugReport,
  Question,
  Search
}

export const getPostBasePathByType = (type: PostType) =>
  type === PostType.Suggestion
    ? "suggestions"
    : type === PostType.BugReport
    ? "bugs"
    : "questions";

export interface Post {
  title: string;
  content: string; // Markdown
  tags: number[];
  authorName: string;
  authorId: string;
  reactions: Reaction[];
  posted: Date;
  postType: PostType;
  viewerVote: null | "up" | "down";
  postId: number;
  votes: number;
  plainText: string;
  answeredBy: number;
  lastEdit: null | Date;
  public: boolean;
}

export interface Comment {
  content: string;
  posted: Date;
  authorName: string;
  authorId: string;
  postId: number;
  commentId: number;
  repliesTo: number | null;
  reactions: Reaction[];
}

export interface Webhook {
  eventType: WebhookEvent;
  requestURL: string;
  hookId: number;
}

export enum WebhookEvent {
  TagAdd = "TagAdd",
  TagRemove = "TagRemove",
  PostCreate = "PostCreate",
  PostEdit = "PostEdit",
  PostDelete = "PostDelete",
  PostAnswer = "PostAnswer",
  PostPublicized = "PostPublicized",
  PostHidden = "PostHidden",
  CommentCreate = "CommentCreate",
  CommentEdit = "CommentEdit",
  CommentDelete = "CommentDelete"
}
