declare module "*.md" {
  const content: string;
  export default content;
}

declare module "express-session" {
  interface SessionData {
    loggedIn: boolean;
    userId: string;
    admin: boolean;
    moderator: boolean;
  }
}
