import Head from "next/head";
import guidelines from "../static-content/posting-guidelines.md";
import style from "@styles/Home.module.css";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { useMemo } from "react";
import { MdRoot } from "../components/mdcomponents";

const Guidelines: React.FC = () => {
  const ast = useMemo(
    () =>
      fromMarkdown(guidelines, {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()]
      }),
    []
  );
  return (
    <>
      <Head>
        <title>Posting guidelines - Scratch Addons Feedback</title>
      </Head>
      <div className={style.main}>
        <MdRoot root={ast} />
      </div>
    </>
  );
};

export default Guidelines;
