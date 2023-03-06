import { Icon } from "@iconify/react";
import style from "@styles/CreatePost.module.css";
import { useState } from "react";
import { useRouter } from "next/router";
import MarkdownEditor from "./MarkdownEditor";
import { buttonProps } from "../common/util";
import Modal from "./Modal";
import Head from "next/head";
import Link from "next/link";

const CreatePost: React.FC = () => {
  const options: {
    value: string;
    name: string;
    icon: string;
    defaultChecked?: boolean;
  }[] = [
    {
      icon: "uil:comment-lines",
      name: "Suggestion",
      value: "suggestion",
      defaultChecked: true
    },
    {
      icon: "uil:bug",
      name: "Bug Report",
      value: "bug"
    },
    {
      icon: "uil:comment-question",
      name: "Question",
      value: "question"
    }
  ];
  const [type, setType] = useState(options[0].value);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [posting, setPosting] = useState(false);
  const router = useRouter();
  return (
    <>
      <Head>
        <title>New Post - Scratch Addons Feedback</title>
      </Head>
      <form
        className={style.container}
        onSubmit={(e) => {
          e.preventDefault();
          setPosting(true);
          fetch("/postapi/post", {
            method: "post",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              title,
              content,
              postType: type
            })
          }).then((res) => {
            res.text().then((url) => router.push(url));
          });
        }}
      >
        <div className={style.header}>
          <h1>Create New Post</h1>
          <input
            type="text"
            className={style.posttitle}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder="Post title here..."
            required
          />
          <div className={style.typeselect}>
            {options.map((o) => (
              <div
                key={o.value}
                aria-checked={type === o.value}
                title={o.name}
                {...buttonProps(() => setType(o.value))}
                role="radio"
              >
                <Icon icon={o.icon} />
                <p>{o.name}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={style.editor}>
          <p className={style.guidelines}>
            <Icon icon="uil:exclamation-circle" /> Please view the{" "}
            <Link href="/guidelines">posting guidelines</Link> before submitting
            your post.
          </p>
          <MarkdownEditor setValue={setContent} value={content} />
        </div>
        <div className={style.buttons}>
          <Link href="/" className={style.button}>
            Cancel
          </Link>
          <button type="submit" className={style.button}>
            Submit Post
          </button>
        </div>
      </form>
      <Modal visible={posting} focusTrap>
        <div
          className={style.modalcontainer}
          tabIndex={0}
          onFocus={(e) => e.currentTarget.blur()}
        >
          <p>Creating post...</p>
          <Icon icon="ri:loader-2-fill" className={style.modalloader} />
        </div>
      </Modal>
    </>
  );
};

export default CreatePost;
