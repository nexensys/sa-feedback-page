import type {
  Heading,
  Paragraph,
  Text,
  Blockquote,
  List,
  ThematicBreak,
  ListItem,
  HTML,
  Code,
  InlineCode,
  Definition,
  Emphasis,
  Strong,
  Break,
  Link,
  Image,
  LinkReference,
  ImageReference,
  Root
} from "mdast-util-from-markdown/lib";
import {
  PhrasingContent,
  Content,
  ListContent,
  StaticPhrasingContent,
  FootnoteDefinition,
  FootnoteReference,
  Table,
  Delete
} from "mdast";
import React, { useEffect } from "react";

import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-xml-doc";
import "prismjs/plugins/line-highlight/prism-line-highlight.min.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.min.js";
import "prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.min.js";
import "prismjs/plugins/toolbar/prism-toolbar.min.js";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard.min.js";
import "prismjs/plugins/autolinker/prism-autolinker.min.js";
import "prismjs/plugins/show-language/prism-show-language.min.js";

Prism.manual = true;

import mdstyle from "@styles/MD.module.css";
import DOMPurify from "dompurify";
import { useAppDispatch, useAppSelector } from "../redux/store";
import {
  addDefinition,
  addFootnote,
  removeDefinition,
  removeFootnote
} from "../redux/slices/markdownSlice";

const MdIDContext = React.createContext<string>("");

const Paragraph: React.FC<{
  paragraph: Paragraph;
}> = ({ paragraph }) => {
  return (
    <div className={mdstyle.paragraph}>
      {paragraph.children.map((content, idx) => (
        <PhrasingContent key={`p-c-${idx}`} content={content} />
      ))}
    </div>
  );
};

const Heading: React.FC<{
  heading: Heading;
}> = ({ heading }) => {
  return React.createElement(
    `h${heading.depth}` as `h${1 | 2 | 3 | 4 | 5 | 6}`,
    {
      className: mdstyle.heading
    },
    heading.children.map((content, idx) => (
      <PhrasingContent content={content} key={`h-c-${idx}`} />
    ))
  );
};

const ThematicBreak: React.FC = () => {
  return <div className={mdstyle.thematicbreak} />;
};

const BlockQuote: React.FC<{
  blockQuote: Blockquote;
}> = ({ blockQuote }) => {
  return (
    <blockquote className={mdstyle.blockquote}>
      {blockQuote.children.map((content, idx) => (
        <TransparentContent content={content} key={`bq-c-${idx}`} />
      ))}
    </blockquote>
  );
};

const List: React.FC<{
  list: List;
}> = ({ list }) => {
  if (list.ordered) {
    return (
      <ol className={mdstyle.list} start={list.start ?? 1}>
        {list.children.map((content, idx) => (
          <ListItem listItem={content} key={`li-c-${idx}`} />
        ))}
      </ol>
    );
  } else {
    return (
      <ul className={mdstyle.list}>
        {list.children.map((content, idx) => (
          <ListContent content={content} key={`l-c-${idx}`} />
        ))}
      </ul>
    );
  }
};

const ListItem: React.FC<{
  listItem: ListItem;
}> = ({ listItem }) => {
  const hasCheck = "checked" in listItem && listItem.checked !== null;
  return (
    <li
      className={`${mdstyle.listitem} ${
        hasCheck ? mdstyle.listitemwithcheck : ""
      }`}
    >
      {hasCheck ? (
        <input type="checkbox" checked={listItem.checked as boolean} disabled />
      ) : null}
      {listItem.children.map((content, idx) => (
        <TransparentContent content={content} key={`li-c${idx}`} />
      ))}
    </li>
  );
};

const HTML: React.FC<{
  html: HTML;
}> = ({ html }) => {
  const [mounted, setMounted] = React.useState(false);
  const sanitizedHTML = React.useMemo(
    () => (mounted ? DOMPurify.sanitize(html.value) : ""),
    [html.value, mounted]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={mdstyle.html}
      dangerouslySetInnerHTML={{
        __html: sanitizedHTML
      }}
    />
  );
};

const Code: React.FC<{
  code: Code;
}> = ({ code }) => {
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => {
    if (ref.current) Prism.highlightAllUnder(ref.current, false);
  }, [ref, code]);
  const meta = React.useMemo(() => {
    return Object.fromEntries(
      (code.meta?.split(/\s+(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/) || [])
        .map((prop) => {
          const split = prop.split("=");
          return [`data-${split[0]}`, split[1].replace(/^\"(.*)\"$/, "$1")];
        })
        .filter((pair) => !/^on/.test(pair[0]))
    );
  }, [code.meta]);
  return (
    <div key="code">
      <pre
        className={`${mdstyle.code} ${
          code.lang ? `language-${code.lang}` : ""
        } line-numbers`}
        ref={ref}
        {...meta}
      >
        <code>{code.value}</code>
      </pre>
    </div>
  );
};

const Definition: React.FC<{
  definition: Definition;
}> = ({ definition }) => {
  const dispatch = useAppDispatch();
  React.useEffect(() => {
    dispatch(addDefinition(definition));
    return () => void dispatch(removeDefinition(definition));
  }, [dispatch, definition]);
  return null;
};

const Text: React.FC<{
  text: Text;
}> = ({ text }) => {
  return <span className={mdstyle.text}>{text.value}</span>;
};

const Emphasis: React.FC<{
  emphasis: Emphasis;
}> = ({ emphasis }) => {
  return (
    <em className={mdstyle.emphasis}>
      {emphasis.children.map((content, idx) => (
        <PhrasingContent content={content} key={`em-c${idx}`} />
      ))}
    </em>
  );
};

const Strong: React.FC<{
  strong: Strong;
}> = ({ strong }) => {
  return (
    <strong className={mdstyle.strong}>
      {strong.children.map((content, idx) => (
        <PhrasingContent content={content} key={`str-c${idx}`} />
      ))}
    </strong>
  );
};

const InlineCode: React.FC<{
  inlineCode: InlineCode;
}> = ({ inlineCode }) => {
  return <code className={mdstyle.inlinecode}>{inlineCode.value}</code>;
};

const Break: React.FC = () => <br />;

const Link: React.FC<{
  link: Link;
}> = ({ link }) => {
  return (
    <a
      href={link.url}
      title={link.title || link.url}
      className={mdstyle.link}
      target="_blank"
      rel="noreferrer"
    >
      {link.children.map((content, idx) => (
        <StaticPhrasingContent content={content} key={`str-c${idx}`} />
      ))}
    </a>
  );
};

const MdImage: React.FC<{
  image: Image;
}> = ({ image }) => {
  return (
    <img
      src={image.url}
      title={image.title || ""}
      alt={image.alt || ""}
      className={mdstyle.image}
    />
  );
};

const LinkReference: React.FC<{ linkReference: LinkReference }> = ({
  linkReference
}) => {
  const definition = useAppSelector((s) =>
    s.markdown.definitions.find(
      (def) => def.identifier === linkReference.identifier
    )
  );

  return (
    <Link
      link={{
        type: "link",
        children: linkReference.children,
        url: definition?.url || ""
      }}
    />
  );
};

const ImageReference: React.FC<{ imageReference: ImageReference }> = ({
  imageReference
}) => {
  const definition = useAppSelector((s) =>
    s.markdown.definitions.find(
      (def) => def.identifier === imageReference.identifier
    )
  );

  return (
    <MdImage
      image={{
        type: "image",
        url: definition?.url || "/",
        alt: imageReference.alt
      }}
    />
  );
};

// GFM
const FootnoteDefinition: React.FC<{
  footnoteDefinition: FootnoteDefinition;
}> = ({ footnoteDefinition }) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(addFootnote(footnoteDefinition));
    return () => void dispatch(removeFootnote(footnoteDefinition));
  }, [dispatch, footnoteDefinition]);
  return null;
};

const FootnoteReference: React.FC<{
  footnoteReference: FootnoteReference;
}> = ({ footnoteReference }) => {
  const footnotes = useAppSelector((s) => s.markdown.footnotes);
  const footnoteIndex = footnotes.findIndex(
    (f) => f.identifier === footnoteReference.identifier
  );
  const rootId = React.useContext(MdIDContext);

  return (
    <sup className={mdstyle.footnotereference}>
      <a href={`#footnote-${rootId}-${footnoteReference.identifier}`}>
        [{footnoteIndex + 1}]
      </a>
    </sup>
  );
};

const Table: React.FC<{ table: Table }> = ({ table }) => {
  const align =
    table.align?.map((a) => a ?? "left") ||
    new Array(table.children[0].children.length).fill("left");
  return (
    <table className={mdstyle.table}>
      <thead>
        <tr>
          {table.children[0].children.map((c, i) => (
            <th key={`t-h-${i}`} align={align[i]}>
              {c.children.map((h, ii) => (
                <PhrasingContent key={`t-h-${i}-c-${ii}`} content={h} />
              ))}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.children.slice(1).map((r, i) => (
          <tr key={`t-r-${i}`}>
            {r.children.map((cell, ii) => (
              <td key={`t-r-${i}-c-${ii}`} align={align[ii]}>
                {cell.children.map((c, iii) => (
                  <PhrasingContent
                    key={`t-r-${i}-c-${ii}-c-${iii}`}
                    content={c}
                  />
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Delete: React.FC<{ del: Delete }> = ({ del }) => {
  return (
    <del className={mdstyle.delete}>
      {del.children.map((content, idx) => (
        <TransparentContent content={content} key={`del-c${idx}`} />
      ))}
    </del>
  );
};

type FlowContent =
  | Blockquote
  | Code
  | Heading
  | HTML
  | List
  | ThematicBreak
  | Content;

const FlowContent: React.FC<{
  content: FlowContent;
}> = ({ content }) => {
  return <TransparentContent content={content} />;
};

const Content: React.FC<{
  content: Content;
}> = ({ content }) => {
  return <TransparentContent content={content} />;
};

const ListContent: React.FC<{
  content: ListContent;
}> = ({ content }) => {
  return <ListItem listItem={content} />;
};

const PhrasingContent: React.FC<{
  content: PhrasingContent;
}> = ({ content }) => {
  return <TransparentContent content={content} />;
};

const StaticPhrasingContent: React.FC<{
  content: StaticPhrasingContent;
}> = ({ content }) => {
  return <TransparentContent content={content} />;
};

const TransparentContent: React.FC<{
  content:
    | Content
    | ListContent
    | FlowContent
    | PhrasingContent
    | StaticPhrasingContent;
}> = ({ content }) => {
  switch (content.type) {
    case "break":
      return <Break />;
    case "emphasis":
      return <Emphasis emphasis={content} />;
    case "html":
      return <HTML html={content} />;
    case "image":
      return <MdImage image={content} />;
    case "inlineCode":
      return <InlineCode inlineCode={content} />;
    case "strong":
      return <Strong strong={content} />;
    case "text":
      return <Text text={content} />;
    case "link":
      return <Link link={content} />;
    case "definition":
      return <Definition definition={content} />;
    case "paragraph":
      return <Paragraph paragraph={content} />;
    case "blockquote":
      return <BlockQuote blockQuote={content} />;
    case "code":
      return <Code code={content} />;
    case "heading":
      return <Heading heading={content} />;
    case "html":
      return <HTML html={content} />;
    case "list":
      return <List list={content} />;
    case "thematicBreak":
      return <ThematicBreak />;
    case "linkReference":
      return <LinkReference linkReference={content} />;
    case "imageReference":
      return <ImageReference imageReference={content} />;
    case "footnoteDefinition":
      return <FootnoteDefinition footnoteDefinition={content} />;
    case "footnoteReference":
      return <FootnoteReference footnoteReference={content} />;
    case "table":
      return <Table table={content} />;
    case "delete":
      return <Delete del={content} />;
    default:
      return null;
  }
};

const FootnoteContent: React.FC<{ footnote: FootnoteDefinition }> = ({
  footnote
}) => {
  const rootId = React.useContext(MdIDContext);
  return (
    <li
      className={mdstyle.footnotecontent}
      id={`footnote-${rootId}-${footnote.identifier}`}
    >
      {footnote.children.map((c, idx) => (
        <TransparentContent key={`fc-c-${idx}`} content={c} />
      ))}
    </li>
  );
};

export const MdRoot: React.FC<{
  root: Root;
}> = ({ root }) => {
  // Used to prevent duplicate footnote links if comments use footnotes
  // ! Con: Cannot be used in links, will change on every render
  const rootId = React.useId();
  const footnotes = useAppSelector((s) => s.markdown.footnotes);
  return (
    <div className={mdstyle.root}>
      <MdIDContext.Provider value={rootId}>
        {root.children.map((content, idx) => (
          <TransparentContent content={content} key={`r-c-${idx}`} />
        ))}
        {footnotes.length !== 0 ? (
          <ol className={mdstyle.footnotes}>
            {footnotes.map((f, idx) => (
              <FootnoteContent key={`f-${idx}`} footnote={f} />
            ))}
          </ol>
        ) : null}
      </MdIDContext.Provider>
    </div>
  );
};
