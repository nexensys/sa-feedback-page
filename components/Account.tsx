import style from "@styles/Account.module.css";
import { useState, useEffect, createContext, useContext } from "react";
import MenuTip from "./MenuTip";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { buttonProps } from "../common/util";
import { useClickAway } from "../common/hooks";

/* eslint-disable @next/next/no-html-link-for-pages */

export const SessionContext = createContext<{
  username: string;
  avatar: string;
  admin: boolean;
  moderator: boolean;
  hasUnreadNotifications: boolean;
  userId: string | null;
} | null>(null);

const Account: React.FC = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const session = useContext(SessionContext);

  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));

  const toggle = () => {
    setOpen(!open);
  };

  return session?.username ? (
    <div
      className={style.accountcenterwrapper}
      ref={ref}
      aria-roledescription="Opens the account menu."
      {...buttonProps(toggle)}
    >
      <Image
        className={style.avatar}
        src={session!.avatar}
        height={50}
        width={50}
        alt="User profile picture"
      />
      {open ? (
        <>
          <MenuTip />
          <div className={style.accountmenuwrapper}>
            <div
              className={style.accountmenu}
              onClick={(e) => {
                setOpen(false);
              }}
            >
              <p className={style.username}>{session!.username ?? "Guest"}</p>
              <Link className={style.menulink} href="/settings">
                Settings
              </Link>
              {session.admin ? (
                <Link className={style.menulink} href="/admin">
                  Admin Panel
                </Link>
              ) : null}
              <div className={style.seperator} />
              <a className={style.menulink} href="/sessions/logout">
                Log Out
              </a>
            </div>
          </div>
        </>
      ) : null}
    </div>
  ) : (
    <a
      className={style.menulink}
      href={`/sessions/login?r=${encodeURIComponent(
        ["/404", "/500"].includes(router.pathname)
          ? "/"
          : window.location.pathname
      )}`}
    >
      Log In
    </a>
  );
};

export default Account;
