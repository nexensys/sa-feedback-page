import { IWebhook, db } from "./mysql";
import { Webhook, WebhookEvent } from "../common/types";

export async function addWebhook(type: WebhookEvent, url: string) {
  if (
    !/^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/i.test(
      url
    )
  )
    throw "Invalid URL";

  await db.execute("INSERT INTO webhooks(eventType, requestURL) VALUES(?, ?)", [
    type,
    url
  ]);
}

type WebhookEventDataMap = {
  [event in WebhookEvent]: event extends `Tag${string}`
    ? {
        tagId: number;
        tagName: string;
        colors: {
          background: string;
          text: string;
        };
        postId: number;
        tagPrivate: boolean;
      }
    : event extends `Post${string}`
    ? {
        postId: number;
        url: string;
        title: string;
        previewSnippet: string;
        authorName: string;
        authorId: string;
      }
    : event extends `Comment${string}`
    ? {
        postId: number;
        commentId: number;
        url: string;
        authorName: string;
        authorId: string;
      }
    : never;
};

export async function emitWebhookEvent<T extends WebhookEvent>(
  event: T,
  data: WebhookEventDataMap[T]
) {
  const [webhooks] = await db.execute<IWebhook[]>(
    "SELECT requestURL FROM webhooks WHERE eventType = ?",
    [event]
  );

  webhooks.forEach(({ requestURL }) => {
    fetch(requestURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }).catch();
  });
}

export { WebhookEvent };
export type { Webhook };
