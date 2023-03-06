import style from "@styles/AdminPanel.module.css";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { TagsContext } from "./PostsContainer";
import useSWR, { useSWRConfig } from "swr";
import { buttonProps } from "../common/util";
import { Icon } from "@iconify/react";
import Modal from "./Modal";
import type { IUserData } from "../server/mysql";
import { Post } from "@common/types";
import Pagnation from "./Pagnation";
import { PostType } from "../common/types";
import SearchableSelect from "./SearchableSelect";
import Select from "./Select";
import { Webhook, WebhookEvent } from "../common/types";
import Head from "next/head";

const PostRow: React.FC<{
  post: Post;
  edit: () => void;
  deletePost: () => void;
}> = ({ post, edit, deletePost }) => {
  const creationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-us", {
        dateStyle: "medium"
      }).format(new Date(post.posted)),
    [post.posted]
  );

  return (
    <tr className={style.row} role="row">
      <td className={style.posttitle} title={post.title}>
        {post.title}
      </td>
      <td title={post.authorName}>{post.authorName}</td>
      <td className={style.technical} title={post.authorId}>
        {post.authorId}
      </td>
      <td>
        {post.postType === PostType.Suggestion ? (
          <Icon icon="uil:comment-lines" />
        ) : post.postType === PostType.BugReport ? (
          <Icon icon="uil:bug" />
        ) : (
          <Icon icon="uil:comment-question" />
        )}
      </td>
      <td className={style.technical} title={post.postId.toString()}>
        {post.postId}
      </td>
      <td title={creationDate}>{creationDate}</td>
      <td title={`${post.tags.length} tags`}>{post.tags.length}</td>
      <td title={`${post.votes} votes`}>{post.votes}</td>
      <td>
        <div>
          <div className={style.rowcontrols}>
            <div title="Edit post" {...buttonProps(edit)}>
              <Icon icon="uil:pen" />
            </div>
            <div
              title="Delete post"
              {...buttonProps(deletePost)}
              className={style.delete}
            >
              <Icon icon="uil:trash-alt" />
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

const tabs: {
  name: string;
  Component: React.FC;
}[] = [
  {
    name: "General",
    Component: () => <p>No settings here yet...</p>
  },
  {
    name: "Privacy",
    Component: () => <p>No settings here yet...</p>
  },
  {
    name: "Members",
    Component: () => {
      const {
        data: admins,
        error: adminsError,
        isLoading: adminsLoading
      } = useSWR<IUserData[]>("/admin/admins", (url) =>
        fetch(url).then((res) => res.json())
      );
      const {
        data: moderators,
        error: moderatorsError,
        isLoading: moderatorsLoading
      } = useSWR<IUserData[]>("/admin/moderators", (url) =>
        fetch(url).then((res) => res.json())
      );
      const [offset, setOffset] = useState(1);
      const [perPage, setPerPage] = useState(10);
      const {
        data: users,
        error: usersError,
        isLoading: usersLoading
      } = useSWR<IUserData[]>(
        `/admin/users?perPage=${perPage}&offset=${offset - 1}`,
        (url) => fetch(url).then((res) => res.json())
      );
      const { mutate } = useSWRConfig();

      const doMutation = useCallback(() => {
        mutate("/admin/admins");
        mutate("/admin/moderators");
        mutate(`/admin/users?perPage=${perPage}&offset=${offset - 1}`);
      }, [mutate, offset, perPage]);

      const [isEditing, setIsEditing] = useState(false);
      const [editingUser, setEditingUser] = useState("0");
      const [userIsModerator, setUserIsModerator] = useState(false);
      const [userIsAdmin, setUserIsAdmin] = useState(false);
      const [deletingUser, setDeletingUser] = useState(false);

      return (
        <>
          <h1>Users</h1>
          <>
            <h3>Admins</h3>
            <div className={style.listcontainer}>
              {admins && admins.length > 0 ? (
                <table className={style.list} role="table">
                  <thead>
                    <tr className={style.listheader}>
                      <th />
                      <th>Username</th>
                      <th>Admin</th>
                      <th>Moderator</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((user) => (
                      <tr key={user.userId} className={style.row} role="row">
                        <td>
                          <img
                            className={style.avatar}
                            src={`/sessions/useravatar/${user.userId}`}
                            height={50}
                            width={50}
                            alt="User profile picture"
                          />
                        </td>
                        <td>{user.username}</td>
                        <td>{user.admin ? "Yes" : "No"}</td>
                        <td>{user.moderator ? "Yes" : "No"}</td>
                        <td>
                          <div>
                            <div className={style.rowcontrols}>
                              <div
                                title="Edit user"
                                {...buttonProps(() => {
                                  setEditingUser(user.userId);
                                  setUserIsAdmin(user.admin);
                                  setUserIsModerator(user.moderator);
                                  setIsEditing(true);
                                })}
                              >
                                <Icon icon="uil:pen" />
                              </div>
                              <div
                                title="Delete user"
                                {...buttonProps(() => {
                                  setEditingUser(user.userId);
                                  setDeletingUser(true);
                                })}
                                className={style.delete}
                              >
                                <Icon icon="uil:trash-alt" />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={style.nodata}>No users!</p>
              )}
            </div>

            <h3>Moderators</h3>
            <div className={style.listcontainer}>
              {moderators && moderators.length > 0 ? (
                <table className={style.list} role="table">
                  <thead>
                    <tr className={style.listheader}>
                      <th />
                      <th>Username</th>
                      <th>Admin</th>
                      <th>Moderator</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {moderators.map((user) => (
                      <tr key={user.userId} className={style.row} role="row">
                        <td>
                          <img
                            className={style.avatar}
                            src={`/sessions/useravatar/${user.userId}`}
                            height={50}
                            width={50}
                            alt="User profile picture"
                          />
                        </td>
                        <td>{user.username}</td>
                        <td>{user.admin ? "Yes" : "No"}</td>
                        <td>{user.moderator ? "Yes" : "No"}</td>
                        <td>
                          <div>
                            <div className={style.rowcontrols}>
                              <div
                                title="Edit user"
                                {...buttonProps(() => {
                                  setEditingUser(user.userId);
                                  setUserIsAdmin(user.admin);
                                  setUserIsModerator(user.moderator);
                                  setIsEditing(true);
                                })}
                              >
                                <Icon icon="uil:pen" />
                              </div>
                              <div
                                title="Delete user"
                                {...buttonProps(() => {
                                  setEditingUser(user.userId);
                                  setDeletingUser(true);
                                })}
                                className={style.delete}
                              >
                                <Icon icon="uil:trash-alt" />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={style.nodata}>No users!</p>
              )}
            </div>

            <h3>All users</h3>
            <div className={style.listcontainer}>
              {users ? (
                <table className={style.list} role="table">
                  <thead>
                    <tr className={style.listheader}>
                      <th />
                      <th>Username</th>
                      <th>Admin</th>
                      <th>Moderator</th>
                      <th />
                    </tr>
                    <tr>
                      <td colSpan={5}>
                        <Pagnation
                          allowedAmountsPerPage={[10, 20, 50]}
                          defaultPostsPerPage={10}
                          onPageChange={(page, perPage) => {
                            setOffset(page);
                            setPerPage(perPage);
                          }}
                        />
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      users.map((user) => (
                        <tr key={user.userId} className={style.row} role="row">
                          <td>
                            <img
                              className={style.avatar}
                              src={`/sessions/useravatar/${user.userId}`}
                              height={50}
                              width={50}
                              alt="User profile picture"
                            />
                          </td>
                          <td>{user.username}</td>
                          <td>{user.admin ? "Yes" : "No"}</td>
                          <td>{user.moderator ? "Yes" : "No"}</td>
                          <td>
                            <div>
                              <div className={style.rowcontrols}>
                                <div
                                  title="Edit user"
                                  {...buttonProps(() => {
                                    setEditingUser(user.userId);
                                    setUserIsAdmin(user.admin);
                                    setUserIsModerator(user.moderator);
                                    setIsEditing(true);
                                  })}
                                >
                                  <Icon icon="uil:pen" />
                                </div>
                                <div
                                  title="Delete user"
                                  {...buttonProps(() => {
                                    setEditingUser(user.userId);
                                    setDeletingUser(true);
                                  })}
                                  className={style.delete}
                                >
                                  <Icon icon="uil:trash-alt" />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )) // Should never reach here lol, because they should not be in panel
                    }
                  </tbody>
                </table>
              ) : (
                <p className={style.nodata}>No users!</p>
              )}
            </div>
          </>
          <Modal visible={isEditing} focusTrap>
            <form
              className={style.form}
              onSubmit={(e) => {
                e.preventDefault();
                fetch("/admin/change-user", {
                  method: "POST",
                  headers: {
                    "content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    userId: editingUser,
                    admin: userIsAdmin,
                    moderator: userIsModerator
                  })
                }).then(doMutation);
                setIsEditing(false);
              }}
            >
              <h3 className={style.modaltitle}>Edit user</h3>
              <label className={style.check}>
                <input
                  type="checkbox"
                  tabIndex={0}
                  checked={userIsAdmin}
                  onChange={(e) => setUserIsAdmin(e.target.checked)}
                  onKeyDown={(e) => {
                    if (e.key.toLowerCase() !== "enter") return;
                    setUserIsAdmin(!e.currentTarget.checked);
                  }}
                />
                Admin
              </label>
              <label className={style.check}>
                <input
                  type="checkbox"
                  tabIndex={0}
                  checked={userIsModerator}
                  onChange={(e) => setUserIsModerator(e.target.checked)}
                  onKeyDown={(e) => {
                    if (e.key.toLowerCase() !== "enter") return;
                    setUserIsModerator(!e.currentTarget.checked);
                  }}
                />
                Moderator
              </label>
              <div className={style.modalbuttons}>
                <button
                  type="reset"
                  className={style.cancelbutton}
                  {...buttonProps(() => setIsEditing(false))}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={style.selectbutton}
                  tabIndex={0}
                  role="button"
                >
                  Submit
                </button>
              </div>
            </form>
          </Modal>
          <Modal visible={deletingUser} focusTrap>
            <form
              className={style.form}
              onSubmit={(e) => {
                e.preventDefault();
                fetch("/admin/delete-user", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    userId: editingUser
                  })
                }).then(doMutation);
                setDeletingUser(false);
              }}
            >
              <h3 className={style.modaltitle}>Delete user</h3>
              <p>Are you sure you want to delete this user?</p>
              <div className={style.modalbuttons}>
                <button
                  type="reset"
                  className={style.cancelbutton}
                  {...buttonProps(() => setDeletingUser(false))}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={style.selectbutton}
                  tabIndex={0}
                  role="button"
                  style={{
                    borderColor: "red",
                    backgroundColor: "red"
                  }}
                >
                  Delete
                </button>
              </div>
            </form>
          </Modal>
        </>
      );
    }
  },
  {
    name: "Tags",
    Component: () => {
      const tags = useContext(TagsContext);
      const { mutate } = useSWRConfig();
      const [isEditingTag, setIsEditing] = useState(false);
      const [isNewTag, setIsNewTag] = useState(true);
      const [editingTagId, setEditingTagId] = useState(0);
      const [newTagName, setNewTagName] = useState("");
      const [newTagTextColor, setNewTagTextColor] = useState("FFFFFF");
      const [newTagBgColor, setNewTagBgColor] = useState("FF7B26");
      const [newTagIsPrivate, setNewTagIsPrivate] = useState(false);

      useEffect(() => {
        if (!isEditingTag) {
          setNewTagName("");
          setNewTagTextColor("FFFFFF");
          setNewTagBgColor("FF7B26");
          setNewTagIsPrivate(false);
          setEditingTagId(0);
          setIsNewTag(true);
        }
      }, [
        isEditingTag,
        setNewTagName,
        setNewTagTextColor,
        setNewTagBgColor,
        setNewTagIsPrivate,
        setEditingTagId,
        setIsNewTag
      ]);

      return (
        <>
          <h1>Tags</h1>
          <div className={style.listcontainer}>
            {tags.length > 0 ? (
              <table className={style.list} role="table">
                <thead>
                  <tr className={style.listheader}>
                    <th>Name</th>
                    <th>Private</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tagDef) => (
                    <tr key={tagDef.tagId} className={style.row} role="row">
                      <td>
                        <div>
                          <p
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
                            {tagDef.tagName}
                          </p>
                        </div>
                      </td>
                      <td>{tagDef.private ? "Yes" : "No"}</td>
                      <td>
                        <div>
                          <div className={style.rowcontrols}>
                            <div
                              title="Edit tag"
                              {...buttonProps(() => {
                                setIsNewTag(false);
                                setNewTagName(tagDef.tagName);
                                setNewTagTextColor(
                                  tagDef.textColor ?? "FFFFFF"
                                );
                                setNewTagBgColor(tagDef.bgColor ?? "FF7B26");
                                setNewTagIsPrivate(!!tagDef.private);
                                setEditingTagId(tagDef.tagId);
                                setIsEditing(true);
                              })}
                            >
                              <Icon icon="uil:pen" />
                            </div>
                            <div
                              title="Delete tag"
                              {...buttonProps(() => {
                                fetch("/admin/delete-tag", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: JSON.stringify({
                                    tagId: tagDef.tagId
                                  })
                                }).then(() => mutate("/postapi/tags"));
                              })}
                              className={style.delete}
                            >
                              <Icon icon="uil:trash-alt" />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={style.nodata}>No tags configured!</p>
            )}
          </div>
          <>
            <button
              type="button"
              className={`${style.button} ${style.newtag}`}
              {...buttonProps(() => {
                setIsNewTag(true);
                setIsEditing(true);
              })}
            >
              New Tag
            </button>
            <Modal visible={isEditingTag} focusTrap>
              <form
                className={style.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  fetch(isNewTag ? "/admin/add-tag" : "/admin/change-tag", {
                    method: "POST",
                    headers: {
                      "content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      tagName: newTagName,
                      bgColor: newTagBgColor,
                      textColor: newTagTextColor,
                      private: newTagIsPrivate,
                      tagId: editingTagId
                    })
                  }).then(() => {
                    mutate("/postapi/tags");
                  });
                  setIsEditing(false);
                }}
              >
                <h3 className={style.title}>
                  {isNewTag ? "Create a new tag" : "Edit tag"}
                </h3>
                <input
                  type="text"
                  required
                  className={style.textinput}
                  maxLength={30}
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.currentTarget.value)}
                />
                <div className={style.tagcolor}>
                  Text color:
                  <div>
                    <input
                      type="color"
                      value={`#${newTagTextColor}`}
                      onChange={(e) =>
                        setNewTagTextColor(
                          e.currentTarget.value.replace(/#/g, "")
                        )
                      }
                    />
                  </div>
                </div>
                <div className={style.tagcolor}>
                  Background color:
                  <div>
                    <input
                      type="color"
                      value={`#${newTagBgColor}`}
                      onChange={(e) =>
                        setNewTagBgColor(
                          e.currentTarget.value.replace(/#/g, "")
                        )
                      }
                    />
                  </div>
                </div>
                <label className={style.check}>
                  <input
                    type="checkbox"
                    tabIndex={0}
                    checked={newTagIsPrivate}
                    onChange={(e) => setNewTagIsPrivate(e.target.checked)}
                    onKeyDown={(e) => {
                      if (e.key.toLowerCase() !== "enter") return;
                      setNewTagIsPrivate(!e.currentTarget.checked);
                    }}
                  />
                  Private
                </label>
                <div className={style.modalbuttons}>
                  <button
                    type="reset"
                    className={style.cancelbutton}
                    {...buttonProps(() => setIsEditing(false))}
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
          </>
        </>
      );
    }
  },
  {
    name: "Posts",
    Component: () => {
      const [offset, setOffset] = useState(0);
      const [perPage, setPerPage] = useState(10);
      const {
        data: posts,
        error: postsError,
        isLoading: postsLoading
      } = useSWR<Post[]>(
        `/admin/manage-posts?perPage=${perPage}&offset=${offset - 1}`,
        (url) => fetch(url).then((res) => res.json())
      );
      const {
        data: users,
        error: usersError,
        isLoading: usersLoading
      } = useSWR<IUserData[]>(`/admin/userslist`, (url) =>
        fetch(url).then((res) => res.json())
      );
      const tags = useContext(TagsContext);
      const [editingPost, setEditingPost] = useState(0);
      const [isEditing, setIsEditing] = useState(false);

      const [editingPostData, setEditingPostData] = useState<null | Post>(null);

      const { mutate } = useSWRConfig();

      return (
        <>
          <h1>Posts</h1>
          <div className={style.listcontainer}>
            {posts ? (
              <table className={style.list} role="table">
                <thead>
                  <tr className={style.listheader}>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Author ID</th>
                    <th>Type</th>
                    <th>Post ID</th>
                    <th>Date Posted</th>
                    <th>Tags</th>
                    <th>Votes</th>
                    <th />
                  </tr>
                  <tr>
                    <td colSpan={9}>
                      <Pagnation
                        allowedAmountsPerPage={[10, 20, 50]}
                        defaultPostsPerPage={perPage}
                        onPageChange={(page, perPage) => {
                          setOffset(page);
                          setPerPage(perPage);
                        }}
                        page={offset}
                      />
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <PostRow
                      key={post.postId}
                      post={post}
                      edit={() => {
                        setEditingPost(post.postId);
                        setEditingPostData({ ...post });
                        setIsEditing(true);
                      }}
                      deletePost={() => {
                        fetch("/admin/delete-post", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          body: JSON.stringify({ postId: post.postId })
                        }).then(() =>
                          mutate(
                            `/admin/manage-posts?perPage=${perPage}&offset=${
                              offset - 1
                            }`
                          )
                        );
                      }}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={style.nodata}>No posts!</p>
            )}

            <Modal visible={isEditing && !!editingPostData} focusTrap>
              <form
                className={`${style.form} ${style.posteditform}`}
                onSubmit={(e) => {
                  e.preventDefault();

                  fetch("/admin/edit-post", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify(editingPostData)
                  }).then(() =>
                    mutate(
                      `/admin/manage-posts?perPage=${perPage}&offset=${
                        offset - 1
                      }`
                    )
                  );
                  setIsEditing(false);
                }}
              >
                <h3 className={style.title}>Edit post</h3>
                <label className={style.postinput}>
                  <h4>Title</h4>
                  <input
                    type="text"
                    required
                    className={style.textinput}
                    maxLength={30}
                    placeholder="Enter post name..."
                    value={editingPostData?.title || ""}
                    onChange={(e) =>
                      setEditingPostData(
                        (data) =>
                          data && {
                            ...data,
                            title: e.currentTarget.value
                          }
                      )
                    }
                  />
                </label>
                <label className={style.postinput}>
                  <h4>Author</h4>
                  <SearchableSelect
                    options={(users || []).map((user) => ({
                      value: {
                        userId: user.userId,
                        userName: user.username
                      },
                      name: user.username,
                      matchStrings: [user.username, user.userId]
                    }))}
                    ItemComponent={({ item, name }) => (
                      <div className={style.userselectitem}>
                        <img
                          className={style.avatar}
                          src={`/sessions/useravatar/${item.userId}`}
                          height={50}
                          width={50}
                          alt="User profile picture"
                        />
                        <p>{item.userName}</p>
                      </div>
                    )}
                    placeholder="Select author..."
                    viewportBounds
                    onChange={(value, idx) => {
                      if (value)
                        setEditingPostData(
                          (data) =>
                            data && {
                              ...data,
                              authorId: value.userId,
                              authorName: value.userName
                            }
                        );
                    }}
                    defaultSelectedIdx={
                      users?.find((u) => u.userId === editingPostData?.authorId)
                        ? users?.findIndex(
                            (u) => u.userId === editingPostData?.authorId
                          )
                        : null
                    }
                    allowClear={false}
                  />
                </label>
                <label className={style.postinput}>
                  <h4>Post type</h4>
                  <Select
                    options={[
                      {
                        value: PostType.Suggestion,
                        name: "Suggestion"
                      },
                      {
                        value: PostType.BugReport,
                        name: "Bug Report"
                      },
                      {
                        value: PostType.Question,
                        name: "Question"
                      }
                    ]}
                    ItemComponent={({ item, name }) => (
                      <div className={style.posttype}>
                        <Icon
                          icon={
                            [
                              "uil:comment-lines",
                              "uil:bug",
                              "uil:comment-question"
                            ][item as number]
                          }
                        />
                        <p>{name}</p>
                      </div>
                    )}
                    placeholder="Select post type..."
                    allowClear={false}
                    defaultSelectedIdx={editingPostData?.postType as number}
                    onChange={(value) =>
                      setEditingPostData(
                        (post) =>
                          post && {
                            ...post,
                            postType: value || PostType.Suggestion
                          }
                      )
                    }
                  />
                </label>
                <div className={style.modalbuttons}>
                  <button
                    type="reset"
                    className={style.cancelbutton}
                    {...buttonProps(() => setIsEditing(false))}
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
        </>
      );
    }
  },
  {
    name: "Webhooks",
    Component: () => {
      const {
        data: webhooks,
        isLoading,
        error
      } = useSWR<Webhook[]>("/admin/webhooks", (url) =>
        fetch(url).then((res) => res.json())
      );
      const [isEditing, setIsEditing] = useState(false);
      const [isNewWebhook, setIsNewWebhook] = useState(false);
      const [eventType, setEventType] = useState(WebhookEvent.PostCreate);
      const [reqURL, setReqURL] = useState("");
      const [urlValid, setURLValid] = useState(false);
      const [editingHookId, setEditingHookId] = useState(0);

      const { mutate } = useSWRConfig();

      return (
        <>
          <h3>Admins</h3>
          <div className={style.listcontainer}>
            {webhooks && webhooks.length > 0 ? (
              <table className={style.list} role="table">
                <thead>
                  <tr className={style.listheader}>
                    <th>Trigger Event</th>
                    <th>Request URL</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((webhook) => (
                    <tr key={webhook.hookId} className={style.row} role="row">
                      <td>{webhook.eventType}</td>
                      <td title={webhook.requestURL}>{webhook.requestURL}</td>
                      <td>
                        <div>
                          <div className={style.rowcontrols}>
                            <div
                              title="Edit webhook"
                              {...buttonProps(() => {
                                setEditingHookId(webhook.hookId);
                                setEventType(webhook.eventType);
                                setReqURL(webhook.requestURL);
                                setIsEditing(true);
                              })}
                            >
                              <Icon icon="uil:pen" />
                            </div>
                            <div
                              title="Delete webhook"
                              {...buttonProps(() => {
                                fetch("/admin/remove-webhook", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: JSON.stringify({
                                    hookId: webhook.hookId
                                  })
                                }).then(() => mutate("/admin/webhooks"));
                              })}
                              className={style.delete}
                            >
                              <Icon icon="uil:trash-alt" />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={style.nodata}>No webhooks!</p>
            )}
          </div>
          <button
            type="button"
            className={`${style.button} ${style.newtag}`}
            {...buttonProps(() => {
              setIsEditing(true);
              setIsNewWebhook(true);
            })}
          >
            New Webhook
          </button>
          <Modal visible={isEditing} focusTrap isDialog>
            <form
              className={style.form}
              onSubmit={(e) => {
                e.preventDefault();

                fetch(
                  `/admin/${isNewWebhook ? "add-webhook" : "edit-webhook"}`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      event: eventType,
                      url: reqURL,
                      hookId: editingHookId
                    })
                  }
                ).then(() => mutate("/admin/webhooks"));

                setIsEditing(false);
                setIsNewWebhook(false);
              }}
            >
              <h3 className={style.title}>
                {isNewWebhook ? "Create new webhook" : "Edit webhook"}
              </h3>
              <label>
                <p>Trigger Event</p>
                <Select
                  options={Object.keys(WebhookEvent).map((e) => ({
                    value: e,
                    name: e.replace(
                      /^(Comment|Tag|Post)(.*)$/,
                      (_, $1, $2, $3) => `${$1} ${$2}`
                    )
                  }))}
                  ItemComponent={({ name }) => <>{name}</>}
                  placeholder="Event Trigger"
                  allowClear={false}
                  defaultSelectedIdx={Object.keys(WebhookEvent).findIndex(
                    (e) => e === eventType
                  )}
                  onChange={(v) => v && setEventType(v as WebhookEvent)}
                />
              </label>
              <label>
                <p>Endpoint</p>
                <input
                  type="url"
                  required
                  className={style.textinput}
                  placeholder="Endpoint URL"
                  pattern="^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$"
                  value={reqURL}
                  onChange={(e) => {
                    setReqURL(e.target.value);
                    setURLValid(e.currentTarget.validity.valid);
                  }}
                />
              </label>

              <div className={style.modalbuttons}>
                <button
                  type="reset"
                  className={style.cancelbutton}
                  {...buttonProps(() => setIsEditing(false))}
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
        </>
      );
    }
  }
];

const AdminPanel: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const [{ Component }, setComponent] = useState<{ Component: React.FC }>({
    Component: tabs[selectedTab].Component
  });

  useEffect(() => {
    setComponent({
      Component: tabs[selectedTab].Component
    });
  }, [setComponent, selectedTab]);

  return (
    <>
      <Head>
        <title>Admin panel - Scratch Addons Feedback</title>
      </Head>
      <div className={style.panelcontainer}>
        <div className={style.panelsidebar}>
          {tabs.map((tab, idx) => (
            <div
              key={idx}
              className={style.paneltab}
              data-selected={selectedTab === idx}
              {...buttonProps(() => setSelectedTab(idx))}
            >
              <p>{tab.name}</p>
            </div>
          ))}
        </div>
        <div className={style.panel}>
          <Component />
        </div>
      </div>
    </>
  );
};

export default AdminPanel;
