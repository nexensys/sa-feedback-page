import style from "@styles/Notifications.module.css";
import { UserNotification } from "@common/types";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { useClickAway, useConditionalChangeEffect } from "@common/hooks";
import {
  clearAll,
  clearOne,
  fetchNotifications,
  markAllRead,
  markAsRead,
  setHasUnread
} from "../redux/slices/notificationsSlice";
import MenuTip from "./MenuTip";
import useSWR from "swr";
import fetcher from "@common/sessionFetcher";
import { Icon } from "@iconify/react";
import { buttonProps } from "../common/util";
import { useRouter } from "next/router";

const Notification: React.FC<{ notification: UserNotification }> = ({
  notification
}) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 500);
    return () => clearInterval(interval);
  });
  const seconds = useMemo(
    () => Math.floor((time.getTime() - notification.sent.getTime()) / 1000),
    [time, notification]
  );
  const minutes = useMemo(() => Math.floor(seconds / 60), [seconds]);
  const hours = useMemo(() => Math.floor(minutes / 60), [minutes]);
  const days = useMemo(() => Math.floor(hours / 24), [hours]);
  const timeString = useMemo(
    () =>
      days > 0
        ? `${days} day${days > 1 ? "s" : ""}`
        : hours > 0
        ? `${hours} hour${hours > 1 ? "s" : ""}`
        : minutes > 0
        ? `${minutes} minute${minutes > 1 ? "s" : ""}`
        : `${seconds} second${seconds > 1 ? "s" : ""}`,
    [seconds, minutes, hours, days]
  );

  const dispatch = useAppDispatch();
  const router = useRouter();

  const LinkComponent = useMemo(
    () =>
      router.asPath.replace(/#.*/, "") === window.location.pathname
        ? "a"
        : Link,
    [router]
  );
  const href = useMemo(
    () =>
      router.asPath.replace(/#.*/, "") === window.location.pathname
        ? notification.link.replace(/.*(#.*)$/, "$1")
        : notification.link,
    [router, notification]
  );

  return (
    <div className={style.notificationbody}>
      <LinkComponent className={style.notificationcontent} href={href}>
        <div className={style.notificationtitle}>{notification.title}</div>
        <div className={style.notificationtext}>{notification.content}</div>
        <div className={style.notificationtime}>{timeString} ago</div>
      </LinkComponent>
      <div className={style.notificationbuttons}>
        <div
          className={style.notificationindicator}
          style={{
            visibility: !notification.viewed ? "visible" : "hidden"
          }}
        />
        <a
          title="Delete notification"
          className={style.notificationbutton}
          {...buttonProps(() => dispatch(clearOne(notification.uuid)))}
        >
          <Icon icon="uil:trash-alt" />
        </a>
        <a
          title="Mark notification as read"
          className={style.notificationbutton}
          {...buttonProps(() => dispatch(markAsRead(notification.uuid)))}
        >
          <Icon icon="material-symbols:mail-outline-rounded" />
        </a>
      </div>
    </div>
  );
};

const Notifications: React.FC = () => {
  const { data } = useSWR("/sessions/notifications/hasunread", fetcher);
  const notifications = useAppSelector((s) => s.notifications);
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));

  useConditionalChangeEffect(
    (changes) => {
      if (changes[1] && open) {
        dispatch(fetchNotifications());
      }
    },
    [dispatch, open]
  );

  useEffect(() => {
    dispatch(setHasUnread(!!data && data.hasUnreadNotifications));
  }, [dispatch, data, data?.hasUnreadNotifications]);

  const toggle = () => {
    setOpen(!open);
  };

  return (
    <div className={style.notificationcenter} ref={ref}>
      <div
        className={style.bellcontainer}
        aria-roledescription="Opens the notifications menu."
        {...buttonProps(toggle)}
      >
        <Icon
          icon="mdi:bell-outline"
          className={style.notificationbell}
          height="1.5rem"
          width="1.5rem"
        />
        {notifications.hasUnread ? (
          <div className={style.notificationbellindicator} />
        ) : null}
      </div>
      {open ? (
        <>
          <MenuTip />
          <div className={style.notificationsmenu}>
            {notifications.loadingState === "suceeded" ? (
              <>
                {notifications.notifications.length === 0 ? (
                  <div className={style.empty}>
                    <Icon
                      icon="mdi:bell-off-outline"
                      height="3rem"
                      width="3rem"
                    />
                  </div>
                ) : null}
                <div className={style.notificationsscroll}>
                  {notifications.notifications.map((n) => (
                    <Notification
                      notification={
                        { ...n, sent: new Date(n.sent) } as UserNotification
                      }
                      key={n.sent}
                    />
                  ))}
                </div>
                <div className={style.notificationcontrols}>
                  <a {...buttonProps(() => dispatch(markAllRead()))}>
                    Mark all as read
                  </a>
                  <Icon
                    icon="lucide:refresh-cw"
                    {...buttonProps(() => dispatch(fetchNotifications()))}
                  />
                  <a {...buttonProps(() => dispatch(clearAll()))}>Clear all</a>
                </div>
              </>
            ) : (
              <div className={style.empty}>
                <Icon icon="ri:loader-2-fill" className={style.loader} />
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Notifications;
