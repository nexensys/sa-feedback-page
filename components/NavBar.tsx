import Image from "next/image";
import style from "@styles/NavBar.module.css";
import Link from "next/link";
import useSWR from "swr";
import Notifications from "./Notifications";
import Account from "./Account";
import fetcher from "@common/sessionFetcher";
import { Icon } from "@iconify/react";

export const NavBar: React.FC = () => {
  const { data, error, isLoading } = useSWR("/sessions/session", fetcher);

  return (
    <div className={style.container}>
      <nav className={style.wrapper}>
        <Link href="/" className={style.iconlink} tabIndex={0}>
          <Image
            className={style.icon}
            src="/icon.svg"
            alt="Scratch Addons icon"
            width={50}
            height={50}
          />
          <p>Scratch Addons Feedback</p>
        </Link>
        <div className={style.accountwrapper}>
          <div className={style.accountcenter}>
            <Link href="/create" title="New Post" className={style.createpost}>
              <Icon icon="uil:comment-plus" height="1.25rem" width="1.25rem" />
              New Post
            </Link>
            <div className={style.seperator} />
            {!!error || isLoading ? null : (
              <>
                {data!.username ? <Notifications /> : null}
                <Account />
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};
