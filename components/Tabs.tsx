import { useRouter } from "next/router";
import { Icon } from "@iconify/react";
import { IconifyIcon } from "@iconify/types";

import style from "@styles/Tabs.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import Modal from "./Modal";
import Footer from "./Footer";

interface Tab {
  icon: string | IconifyIcon;
  text: string;
  path: string;
  test?: RegExp;
}

const Tab: React.FC<Tab> = ({ icon, text, path, test }) => {
  const router = useRouter();

  const selected = useMemo(
    () =>
      test
        ? test.test(router.pathname)
        : `/${router.query.postType}`.startsWith(path),
    [test, path, router]
  );

  return (
    <li className={`${style.tab} ${selected ? style.selected : ""}`}>
      <Link href={path} title={text}>
        <Icon icon={icon} height="1em" width="1em" />
        <p>{text}</p>
      </Link>
    </li>
  );
};

const appTabs: Tab[] = [
  {
    icon: "uil:home-alt",
    text: "Home",
    path: "/",
    test: /^\/$/
  },
  {
    icon: "uil:comment-lines",
    text: "Suggestions",
    path: "/suggestions"
  },
  {
    icon: "uil:bug",
    text: "Bug Reports",
    path: "/bugs"
  },
  {
    icon: "uil:comment-question",
    text: "Help & Questions",
    path: "/questions"
  },
  {
    icon: "uil:comment-info",
    text: "FAQ",
    path: "/faq"
  },
  {
    icon: "uil:comment-search",
    text: "Search",
    path: "/search",
    test: /^\/search/
  }
];

const Tabs: React.FC = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  return (
    <div className={style.container}>
      <ul className={style.tabs} role="menu">
        {appTabs.map((tab) => (
          <Tab {...tab} key={tab.text} />
        ))}
      </ul>

      <Footer />
    </div>
  );
};

export default Tabs;
