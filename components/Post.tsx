import style from "@styles/Post.module.css";
import { Comment, Post, Reaction } from "@common/types";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { useEffect, useMemo, useState, useContext } from "react";
import { MdRoot } from "@components/mdcomponents";
import { Icon } from "@iconify/react";
import {
  useConditionalChangeEffect,
  useRouterAndServerPropsRefresh
} from "../common/hooks";
import { TagsContext } from "./PostsContainer";
import { SessionContext } from "./Account";
import MarkdownEditor from "./MarkdownEditor";
import { useRouter } from "next/router";
import useSWR, { useSWRConfig } from "swr";
import { Emoji, EmojiPicker } from "./EmojiPicker";
import { buttonProps } from "../common/util";
import Modal from "./Modal";
import Select from "./Select";
import Head from "next/head";

const addReaction = (
  emoji: string,
  target: number,
  targetType: string,
  del: boolean
) =>
  fetch("/postapi/react", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      emoji,
      target,
      targetType,
      remove: del
    })
  });

const groupReactions = (reactions: Reaction[]) =>
  reactions.reduce((obj, reaction) => {
    if (reaction.type in obj) {
      obj[reaction.type].push(reaction.user);
    } else {
      obj[reaction.type] = [reaction.user];
    }
    return obj;
  }, {} as Record<string, string[]>);

const ReactionsList: React.FC<{
  reactions: Record<string, string[]>;
  toggle: (emoji: string, selected: boolean) => void;
}> = ({ reactions, toggle }) => {
  const userId = useContext(SessionContext)?.userId;
  const reactionGroups = useMemo(
    () =>
      Object.entries(reactions).map((group) => ({
        emoji: group[0],
        visibleUsers: group[1].slice(-5),
        hiddenUsers: Math.max(0, group[1].length - 5),
        users: group[1]
      })),
    [reactions]
  );
  return (
    <div className={style.reactionslist}>
      {reactionGroups.map((group) => (
        <div
          className={style.reactiongroup}
          key={group.emoji}
          data-selected={group.users.includes(userId!)}
          title={
            group.users.includes(userId!)
              ? "Remove this reaction"
              : "Add this reaction"
          }
          {...buttonProps(() =>
            toggle(group.emoji, !group.users.includes(userId!))
          )}
        >
          <Emoji unified={group.emoji} size={18} />
          <div className={style.reactionusers}>
            {group.hiddenUsers > 0 ? (
              <div className={`${style.reactionuser} ${style.hiddenusercount}`}>
                +{group.hiddenUsers}
              </div>
            ) : null}
            {group.visibleUsers.map((user) => (
              <img
                key={user}
                src={`/sessions/useravatar/${user}`}
                alt="User icon"
                height={18}
                width={18}
                className={style.reactionuser}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Comment: React.FC<{
  comment: Comment & { replyToAuthor?: string };
  reply: () => void;
  mutate: () => void;
  post: Post;
}> = ({ comment, reply, mutate, post }) => {
  const ast = useMemo(
    () =>
      fromMarkdown(comment.content, {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()]
      }),
    [comment.content]
  );
  const [allReactions, setReactions] = useState(comment.reactions);
  const groupedReactions = useMemo(
    () => groupReactions(allReactions),
    [allReactions]
  );
  const userId = useContext(SessionContext)?.userId;
  const creationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-us", {
        dateStyle: "medium"
      }).format(new Date(comment.posted)),
    [comment.posted]
  );
  const [router, refresh] = useRouterAndServerPropsRefresh();
  const session = useContext(SessionContext);
  const [editing, setEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(comment.content);
  useEffect(() => {
    setEditingContent(comment.content);
  }, [setEditingContent, comment.content]);

  return (
    <>
      <img
        className={style.authoravatar}
        src={`/sessions/useravatar/${comment.authorId}`}
        alt={comment.authorName}
      />
      <div
        className={`${style.commentcontainer} ${
          post.answeredBy === comment.commentId ? style.answer : ""
        }`}
        id={`comment-${comment.commentId}`}
      >
        <div className={style.commentheader}>
          <p>{comment.authorName}</p>
          {comment.repliesTo ? (
            <a
              href={`#comment-${comment.repliesTo}`}
              className={style.commentreply}
            >
              Replying to{" "}
              <span className={style.commentreplytoname}>
                {comment.replyToAuthor}
              </span>
            </a>
          ) : null}
          <p className={style.commentposted}>on {creationDate}</p>
          <div className={style.commenttoolbarcontainer}>
            <div className={style.commenttoolbar}>
              {session?.userId === comment.authorId ||
              session?.admin ||
              session?.moderator ? (
                <div
                  title="Delete"
                  {...buttonProps(() => {
                    fetch(`/postapi/delete-comment/${comment.commentId}`, {
                      method: "POST"
                    }).then(() => refresh());
                  })}
                >
                  <Icon icon="uil:trash-alt" />
                </div>
              ) : null}
              {(session?.userId === comment.authorId || session?.admin) &&
              !editing ? (
                <div
                  title="Edit"
                  className={style.edit}
                  {...buttonProps(() => {
                    setEditing(true);
                  })}
                >
                  <Icon icon="uil:pen" />
                </div>
              ) : null}
              {(post.authorId === session?.userId ||
                session?.moderator ||
                session?.admin) &&
              post.answeredBy !== comment.commentId ? (
                <div
                  title="Mark as answer"
                  {...buttonProps(() => {
                    fetch(`/postapi/answer/${post.postId}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({ commentId: comment.commentId })
                    }).then(() => refresh());
                  })}
                >
                  <Icon icon="uil:check-circle" />
                </div>
              ) : null}
              <div
                title="Reply to this comment"
                {...buttonProps(() => reply())}
              >
                <Icon icon="ic:round-reply" />
              </div>
              <a
                href={`#comment-${comment.commentId}`}
                title="Link to this comment"
              >
                <Icon icon="ic:round-link" />
              </a>
            </div>
          </div>
        </div>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              fetch(`/postapi/edit-comment/${comment.commentId}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ content: editingContent })
              }).then(() => refresh());
            }}
          >
            <MarkdownEditor
              value={editingContent}
              setValue={setEditingContent}
            />
            <button
              style={{
                float: "right"
              }}
              type="submit"
              className={style.addcomment}
            >
              Save
            </button>
          </form>
        ) : (
          <MdRoot root={ast} />
        )}
        <div className={style.reactions}>
          <EmojiPicker
            onEmojiClick={(emoji) => {
              if (!userId) return;
              addReaction(emoji, comment.commentId, "comment", false)
                .then((res) => {
                  if (res.status === 400) {
                    setReactions((prev) =>
                      prev.filter(
                        (r) => !(r.type === emoji && r.user === userId)
                      )
                    );
                  }
                })
                .finally(() => {
                  mutate();
                });
              if (
                allReactions.findIndex(
                  (r) => r.type === emoji && r.user === userId
                ) < 0
              ) {
                setReactions((prev) =>
                  prev.concat({
                    type: emoji,
                    user: userId
                  })
                );
              }
            }}
          />
          <ReactionsList
            reactions={groupedReactions}
            toggle={(emoji, selected) => {
              if (!userId) return;
              addReaction(emoji, comment.commentId, "comment", !selected)
                .then((res) => {
                  if (res.status === 400) {
                    setReactions((prev) =>
                      prev.filter(
                        (r) => !(r.type === emoji && r.user === userId)
                      )
                    );
                  }
                })
                .finally(() => mutate());
              if (
                selected &&
                allReactions.findIndex(
                  (r) => r.type === emoji && r.user === userId
                ) < 0
              ) {
                setReactions((prev) =>
                  prev.concat({
                    type: emoji,
                    user: userId
                  })
                );
              } else if (
                !selected &&
                allReactions.findIndex(
                  (r) => r.type === emoji && r.user === userId
                ) > -1
              ) {
                setReactions((prev) =>
                  prev.filter((r) => !(r.type === emoji && r.user === userId))
                );
              }
            }}
          />
          {post.answeredBy === comment.commentId ? (
            <div className={style.answerlabel} title="Marked as answer">
              <Icon icon="uil:check" />
              <p>Marked as answer</p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

const CommentEditor: React.FC<{
  addComment: (comment: Comment & { posted: string }) => void;
  replyTo: number | null;
  setReplyTo: (replyTo: number | null) => void;
  replyToAuthor: string | null;
  onSubmit: () => void;
}> = ({ addComment, replyTo, setReplyTo, replyToAuthor, onSubmit }) => {
  const [content, setContent] = useState("");
  const router = useRouter();
  return (
    <div className={style.commenteditorwrapper}>
      <form
        className={style.commenteditor}
        onSubmit={(e) => {
          e.preventDefault();
          fetch(`/postapi/comment/${router.query.postId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ content, repliesTo: replyTo })
          })
            .then((res) => res.json())
            .then((comment) => addComment(comment));
          setContent("");
          onSubmit();
        }}
      >
        <h3>Add a comment</h3>
        {replyTo ? (
          <div className={style.commentreplyto}>
            <a href={`#comment-${replyTo}`}>
              Replying to{" "}
              <span className={style.commentreplytoname}>{replyToAuthor}</span>
            </a>
            {/* Spacer */}
            <div />
            <Icon
              icon="uil:x"
              {...buttonProps((e) => {
                setReplyTo(null);
              })}
            />
          </div>
        ) : null}
        <MarkdownEditor value={content} setValue={setContent} />
        <button type="submit" className={style.addcomment}>
          Add Comment
        </button>
      </form>
    </div>
  );
};

const Post: React.FC<{
  post: Post & { posted: string; lastEdit: string };
  comments: (Comment & { posted: string })[];
}> = ({ post, comments }) => {
  const ast = useMemo(
    () =>
      fromMarkdown(post.content, {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()]
      }),
    [post.content]
  );
  const [viewerVote, setViewerVote] = useState<
    null | "up" | "down" | undefined
  >(undefined);
  const [initialVote, setInitialVote] = useState<
    null | "up" | "down" | undefined
  >(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [allComments, setComments] = useState(comments);
  useEffect(() => {
    setComments(comments);
  }, [setComments, comments]);
  const [allReactions, setReactions] = useState(post.reactions);
  useEffect(() => {
    setReactions(post.reactions);
  }, [setReactions, post.reactions]);
  const groupedReactions = useMemo(
    () => groupReactions(allReactions),
    [allReactions]
  );
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const { data: updatedComments, error: commentUpdateError } = useSWR(
    `/postapi/comments/${post.postId}`,
    (url) =>
      fetch(url).then(
        (res) => res.json() as Promise<(Comment & { posted: string })[]>
      )
  );
  const { data: updatedReactions, error: reactionsUpdateError } = useSWR(
    `/postapi/reactions/${post.postId}`,
    (url) => fetch(url).then((res) => res.json() as Promise<Reaction[]>)
  );
  const { mutate } = useSWRConfig();
  useEffect(() => {
    if (updatedComments && !commentUpdateError) setComments(updatedComments);
  }, [updatedComments, commentUpdateError, setComments]);
  useEffect(() => {
    if (updatedReactions && !reactionsUpdateError)
      setReactions(updatedReactions);
  }, [updatedReactions, reactionsUpdateError, setReactions]);
  const session = useContext(SessionContext);
  useEffect(() => {
    if (session?.username)
      (async () => {
        const voteReq = await fetch(`/sessions/votes/${post.postId}`);
        if (voteReq) {
          const vote = await voteReq.json();
          setViewerVote(vote);
          setInitialVote(vote);
        } else {
          setViewerVote(null);
          setInitialVote(null);
        }
        setHasLoaded(true);
      })();
    else {
      setInitialVote(null);
      setViewerVote(null);
      setHasLoaded(true);
    }
  }, [session, post.postId]);
  const enabled = useMemo(
    () => (session?.username ? true : false),
    [session?.username]
  );
  useConditionalChangeEffect(
    (changes) => {
      if (hasLoaded && changes[1] && !changes[0])
        fetch(`/sessions/votes/${post.postId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ vote: viewerVote })
        });
      if (
        hasLoaded &&
        typeof viewerVote !== "undefined" &&
        typeof initialVote === "undefined"
      )
        setInitialVote(viewerVote);
    },
    [hasLoaded, viewerVote]
  );
  const creationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-us", {
        dateStyle: "medium"
      }).format(new Date(post.posted)),
    [post.posted]
  );
  const editDate = useMemo(
    () =>
      post.lastEdit &&
      new Intl.DateTimeFormat("en-us", {
        dateStyle: "medium"
      }).format(new Date(post.lastEdit)),
    [post.lastEdit]
  );
  const tags = useContext(TagsContext);
  const [postTags, setPostTags] = useState(post.tags);
  useEffect(() => {
    setPostTags(post.tags);
  }, [setPostTags, post.tags]);
  const userId = useContext(SessionContext)?.userId;
  useEffect(() => {
    const time = 1000 /* ms */ * 60 /* sec */ * 60 /* min */ * 5;
    let interval: NodeJS.Timer;
    const timeout: NodeJS.Timeout = setTimeout(() => {
      interval = setInterval(() => {
        mutate(`/postapi/comments/${post.postId}`);
      }, time);
    }, time);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [mutate, post.postId]);

  const [addTagModalOpen, setAddTagModalOpen] = useState(false);
  const [addingTagID, setAddingTagID] = useState<null | number>(null);

  const [router, refresh] = useRouterAndServerPropsRefresh();

  useEffect(() => {
    let first = true;
    const interval = setInterval(() => {
      if (!first) {
        console.log("Refresh");
        refresh();
      } else first = false;
    }, 600000);

    return () => {
      console.log("Cleanup");
      clearInterval(interval);
    };
  }, [refresh]);

  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  const [editingContentValue, setEditingContentValue] = useState(post.content);
  useEffect(() => {
    setEditingContentValue(post.content);
    setEditing(false);
  }, [setEditingContentValue, post.content, setEditing]);
  const [editingTitleValue, setEditingTitleValue] = useState(post.content);
  useEffect(() => {
    setEditingTitleValue(post.title);
    setEditingTitle(false);
  }, [setEditingTitleValue, post.title, setEditingTitle]);

  const answerComment = comments.find((c) => c.commentId === post.answeredBy);

  return (
    <>
      <Head>
        <title>{post.title} - Scratch Addons Feedback</title>
      </Head>
      <div className={style.postcontainer}>
        <div className={style.postheader}>
          <div className={style.posttitle}>
            {!editingTitle ? (
              <h1>{post.title}</h1>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditingTitle(false);
                  fetch(`/postapi/edit-post/${post.postId}`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ title: editingTitleValue })
                  }).then(() => refresh());
                }}
                className={style.edittitle}
              >
                <input
                  type="text"
                  className={style.textinput}
                  placeholder="Title"
                  required
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.currentTarget.value)}
                  style={{ fontSize: "1rem" }}
                />
                <button type="submit" className={style.addcomment}>
                  Save
                </button>
              </form>
            )}
            {(session?.userId === post.authorId || session?.admin) &&
            !editingTitle ? (
              <div
                className={style.edit}
                {...buttonProps(() => {
                  setEditingTitle(true);
                })}
              >
                <Icon icon="uil:pen" />
              </div>
            ) : null}
          </div>
          <p className={style.postcreation}>
            Created by {post.authorName} on {creationDate}
            {editDate ? ` (edited on ${editDate})` : ""}
          </p>
          <div className={style.postcategorydata}>
            {post.tags.length > 0 || session?.moderator ? (
              <div className={style.tags}>
                <p>Tags:</p>
                <div className={style.tagslist}>
                  {postTags
                    .filter(
                      (tag) => tags.findIndex((tdef) => tdef.tagId === tag) >= 0
                    )
                    .map((t) => {
                      const tagDef = tags.find((tdef) => tdef.tagId === t)!;
                      return (
                        <div
                          key={tagDef.tagName}
                          className={style.tag}
                          style={{
                            color: tagDef.textColor
                              ? `#${tagDef.textColor}`
                              : "white",
                            backgroundColor: tagDef.bgColor
                              ? `#${tagDef.bgColor}`
                              : "rgb(var(--accent-rgb))"
                          }}
                        >
                          <p>{tagDef.tagName}</p>
                          {session?.moderator || session?.admin ? (
                            <div
                              className={style.deltag}
                              {...buttonProps(() => {
                                fetch(`/mod/${post.postId}/remove-tag`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: JSON.stringify({ tagId: tagDef.tagId })
                                }).then(() =>
                                  setPostTags((tags) =>
                                    tags.filter((tag) => tag !== tagDef.tagId)
                                  )
                                );
                              })}
                            >
                              <Icon icon="uil:trash-alt" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  {session?.moderator || session?.admin ? (
                    <div
                      className={style.addtag}
                      {...buttonProps(() => {
                        setAddTagModalOpen(true);
                      })}
                    >
                      <Icon icon="uil:plus" />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div
              className={style.visibility}
              title={
                session?.moderator || session?.admin
                  ? `Make this post ${post.public ? "private" : "public"}`
                  : post.public
                  ? "This post is public"
                  : "This post is private"
              }
              style={{
                cursor:
                  session?.moderator || session?.admin ? "pointer" : "default"
              }}
              {...(session?.moderator || session?.admin
                ? buttonProps(() => {
                    fetch(
                      `/mod/${post.public ? "private" : "public"}/${
                        post.postId
                      }`,
                      {
                        method: "POST"
                      }
                    ).then(() => {
                      refresh();
                    });
                  })
                : {})}
            >
              {post.public ? (
                <Icon icon="uil:eye" />
              ) : (
                <Icon icon="uil:eye-slash" />
              )}
              <p>
                {post.public
                  ? "This post is currently public."
                  : "This post is currently private."}
              </p>
            </div>
          </div>
          <Modal visible={addTagModalOpen} focusTrap isDialog>
            <form
              className={style.form}
              onSubmit={(e) => {
                e.preventDefault();
                setAddTagModalOpen(false);
                if (addingTagID === null) return;
                fetch(`/mod/${post.postId}/add-tag`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ tagId: addingTagID })
                }).then(() => {
                  setPostTags((tags) => [...new Set([...tags, addingTagID])]);
                });
                setAddingTagID(null);
              }}
            >
              <h3 className={style.title}>Add a tag</h3>
              <label className={style.input}>
                New tag:
                <Select
                  options={tags.map((tag) => ({
                    value: tag,
                    name: tag.tagName
                  }))}
                  ItemComponent={({ item }) => (
                    <div
                      className={style.tag}
                      style={{
                        color: item.textColor ? `#${item.textColor}` : "white",
                        backgroundColor: item.bgColor
                          ? `#${item.bgColor}`
                          : "rgb(var(--accent-rgb))"
                      }}
                    >
                      <p>{item.tagName}</p>
                    </div>
                  )}
                  onChange={(value) => {
                    setAddingTagID(value && value.tagId);
                  }}
                  placeholder="Select a tag..."
                />
              </label>
              <div className={style.modalbuttons}>
                <button
                  type="reset"
                  className={style.cancelbutton}
                  {...buttonProps(() => setAddTagModalOpen(false))}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={style.selectbutton}
                  tabIndex={0}
                  role="button"
                >
                  Save
                </button>
              </div>
            </form>
          </Modal>
        </div>
        <div className={style.poststats}>
          <img
            className={style.authoravatar}
            src={`/sessions/useravatar/${post.authorId}`}
            alt={post.authorName}
          />
          <div className={style.postvote}>
            <Icon
              icon="material-symbols:keyboard-arrow-up-rounded"
              style={{
                color:
                  viewerVote === "up"
                    ? "rgb(var(--accent-rgb))"
                    : "currentColor",
                backgroundColor:
                  viewerVote === "up"
                    ? "rgba(var(--accent-rgb), 0.25)"
                    : "transparent"
              }}
              aria-disabled={!enabled}
              {...buttonProps(() => {
                if (enabled) setViewerVote("up");
              })}
            />
            <p>
              {hasLoaded && typeof initialVote !== "undefined"
                ? post.votes -
                  (initialVote === null ? 0 : initialVote === "up" ? 1 : -1) +
                  (viewerVote === null ? 0 : viewerVote === "up" ? 1 : -1)
                : "?"}
            </p>
            <Icon
              icon="material-symbols:keyboard-arrow-down-rounded"
              style={{
                color:
                  viewerVote === "down"
                    ? "rgb(var(--accent-rgb))"
                    : "currentColor",
                backgroundColor:
                  viewerVote === "down"
                    ? "rgba(var(--accent-rgb), 0.25)"
                    : "transparent"
              }}
              aria-disabled={!enabled}
              {...buttonProps(() => {
                if (enabled) setViewerVote("down");
              })}
            />
          </div>
        </div>
        <div className={style.postbody}>
          {(session?.userId === post.authorId || session?.admin) && !editing ? (
            <div
              className={style.edit}
              {...buttonProps(() => {
                setEditing(true);
              })}
            >
              <Icon icon="uil:pen" />
            </div>
          ) : null}
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEditing(false);
                fetch(`/postapi/edit-post/${post.postId}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ content: editingContentValue })
                }).then(() => refresh());
              }}
            >
              <MarkdownEditor
                value={editingContentValue}
                setValue={setEditingContentValue}
              />
              <button
                style={{
                  float: "right"
                }}
                type="submit"
                className={style.addcomment}
              >
                Save
              </button>
            </form>
          ) : (
            <MdRoot root={ast} />
          )}
          <div className={style.reactions}>
            <EmojiPicker
              onEmojiClick={(emoji) => {
                if (!userId) return;
                const emojiObj = {
                  type: emoji,
                  user: userId
                };
                addReaction(emoji, post.postId, "post", false)
                  .then((res) => {
                    if (res.status === 400) {
                      setReactions((prev) =>
                        prev.filter(
                          (r) => !(r.type === emoji && r.user === userId)
                        )
                      );
                    }
                  })
                  .finally(() => {
                    mutate(`/postapi/reactions/${post.postId}`);
                  });
                if (
                  allReactions.findIndex(
                    (r) => r.type === emoji && r.user === userId
                  ) < 0
                ) {
                  setReactions([...allReactions, emojiObj]);
                }
              }}
            />
            <ReactionsList
              reactions={groupedReactions}
              toggle={(emoji, selected) => {
                if (!userId) return;
                addReaction(emoji, post.postId, "post", !selected)
                  .then((res) => {
                    if (res.status === 400) {
                      setReactions((prev) =>
                        prev.filter(
                          (r) => !(r.type === emoji && r.user === userId)
                        )
                      );
                    }
                  })
                  .finally(() => mutate(`/postapi/reactions/${post.postId}`));
                if (
                  selected &&
                  allReactions.findIndex(
                    (r) => r.type === emoji && r.user === userId
                  ) < 0
                ) {
                  setReactions([
                    ...allReactions,
                    {
                      type: emoji,
                      user: userId
                    }
                  ]);
                } else if (
                  !selected &&
                  allReactions.findIndex(
                    (r) => r.type === emoji && r.user === userId
                  ) > -1
                ) {
                  setReactions(
                    allReactions.filter(
                      (r) => !(r.type === emoji && r.user === userId)
                    )
                  );
                }
              }}
            />
          </div>
        </div>
        {answerComment ? (
          <a
            href={`#comment-${answerComment.commentId}`}
            className={style.answeredby}
          >
            <img
              className={style.authoravatar}
              src={`/sessions/useravatar/${answerComment.authorId}`}
              alt={answerComment.authorName}
            />
            <p>Answered by {answerComment.authorName}</p>
          </a>
        ) : null}
        <p className={style.commentstitle}>Comments</p>
        <div className={style.comments}>
          {allComments.length > 0 ? (
            allComments.map((c, _) => (
              <Comment
                key={c.commentId}
                comment={{
                  ...c,
                  posted: new Date(c.posted),
                  ...(c.repliesTo &&
                  allComments.findIndex((cc) => cc.commentId === c.repliesTo) >
                    -1
                    ? {
                        replyToAuthor: allComments.find(
                          (cc) => cc.commentId === c.repliesTo
                        )!.authorName,
                        repliesTo: c.repliesTo
                      }
                    : {
                        repliesTo: NaN
                      })
                }}
                reply={() => setReplyTo(c.commentId)}
                mutate={() => mutate(`/postapi/comments/${post.postId}`)}
                post={post}
              />
            ))
          ) : (
            <p className={style.nocomments}>No comments yet!</p>
          )}
        </div>
        <CommentEditor
          addComment={(comment) => {
            setComments([...allComments, comment]);
            mutate(`/postapi/comments/${post.postId}`);
          }}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          replyToAuthor={
            allComments.find((c) => c.commentId === replyTo)?.authorName || null
          }
          onSubmit={() => setReplyTo(null)}
        />
      </div>
    </>
  );
};

export default Post;
