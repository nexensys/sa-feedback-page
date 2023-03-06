# Setup

Install `mysql` server, and create a new user.

```sql
CREATE USER '<username>'@'127.0.0.1' IDENTIFIED BY '<password>';
GRANT ALL ON upvotr.* TO '<username>'@'127.0.0.1';
```

Replace `server/mysql-login.secret.json` with:

```json
{
  "user": "<username>",
  "password": "<password>"
}
```

and run `npm run build`.

To start, simply run `npm start`.

# Webhooks

There are three categories of webhook events:

- `Post` related events
- `Comment` related events
- `Tag` related events

When these events are emitted by the server, an `application/json POST` request is sent to the configured url with the following data, based on the event type:

### `Post`

```ts
interface PostWebhookData {
  postId: number;
  url: string;
  title: string;
  previewSnippet: string;
  authorName: string;
  authorId: string;
}
```

### `Comment`

```ts
interface CommentWebhookData {
  postId: number;
  commentId: number;
  url: string;
  authorName: string;
  authorId: string;
}
```

### `Tag`

```ts
interface TagWebhookData {
  tagId: number;
  tagName: string;
  colors: {
    background: string;
    text: string;
  };
  postId: number;
  tagPrivate: boolean;
}
```

# User messages

Files inside the `static-content` folder are named according to who will see them and/or where they will be shown. However, editing these files will require a full rebuild (at the moment).
