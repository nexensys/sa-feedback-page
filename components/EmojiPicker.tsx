import { EmojiStyle } from "emoji-picker-react";
import style from "@styles/EmojiPicker.module.css";
import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { buttonProps } from "../common/util";
import Modal from "./Modal";
import emojiRegex from "emoji-regex";
import { useClickAway } from "../common/hooks";

const emojis = [
  "1f44d",
  "1f44e",
  "1f600",
  "1f604",
  "1f615",
  "1f914",
  "1f680",
  "2764-fe0f",
  "1f389",
  "1f440"
];

const customEmojiRegex = emojiRegex();

const RealEmoji = dynamic(
  () => import("emoji-picker-react").then((mod) => mod.Emoji),
  {
    ssr: false,
    loading(props) {
      return (
        <div
          style={{
            height: 18,
            width: 18
          }}
        ></div>
      );
    }
  }
);

export const Emoji: typeof RealEmoji = (props) => {
  return (
    <RealEmoji emojiStyle={EmojiStyle.TWITTER} size={18} lazyLoad {...props} />
  );
};

export const EmojiPicker: React.FC<{
  onEmojiClick: (emoji: string) => void;
}> = ({ onEmojiClick }) => {
  const [isOpen, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const ref = useClickAway<HTMLDivElement>(() => setOpen(false));

  const [customEmoji, setCustomEmoji] = useState<string>("");

  return (
    <div className={style.pickercontainer} ref={ref}>
      <div
        className={style.pickerbutton}
        title="Select an emoji"
        {...buttonProps(() => setOpen(!isOpen))}
      >
        <Icon icon="uil:smile" height="1rem" width="1rem" />
      </div>
      <div className={style.floatingpicker} data-open={isOpen}>
        {emojis.map((emoji) => (
          <div
            key={emoji}
            className={style.emojibutton}
            {...buttonProps((e) => {
              onEmojiClick(emoji);
              setOpen(false);
            })}
          >
            <Emoji unified={emoji} lazyLoad={false} />
          </div>
        ))}
        {/*<Icon
          icon="uil:plus"
          className={style.emojibutton}
          {...buttonProps(() => {
            setModalOpen(true);
            setOpen(false);
          })}
        />
        <Modal visible={modalOpen} isDialog focusTrap>
          <form
            className={style.emojiform}
            onSubmit={(e) => {
              e.preventDefault();
              const codePoints = [...customEmoji].map((c) =>
                c.codePointAt(0)!.toString(16).padStart(4, "0")
              );
              onEmojiClick(codePoints.join("-"));
              setCustomEmoji("");
              setModalOpen(false);
            }}
          >
            <h3 className={style.selectcustomtitle}>
              Select A Custom Reaction
            </h3>
            <input
              type="text"
              className={style.emojiinput}
              placeholder="Enter emoji here..."
              value={customEmoji}
              onChange={(e) =>
                setCustomEmoji(
                  e.currentTarget.value.match(customEmojiRegex)?.[0] ?? ""
                )
              }
            />
            <div className={style.selectbuttons}>
              <button
                type="reset"
                className={style.cancelbutton}
                {...buttonProps(() => setModalOpen(false))}
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
        </Modal>*/}
      </div>
    </div>
  );
};
