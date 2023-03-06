import { createPortal } from "react-dom";
import { useState, useEffect, createElement, Fragment } from "react";
import FocusTrap from "focus-trap-react";
import style from "@styles/Modal.module.css";

const Modal: React.FC<
  React.PropsWithChildren<{
    visible: boolean;
    isDialog?: boolean;
    focusTrap?: boolean;
  }>
> = ({ visible, children, isDialog, focusTrap }) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setElement(document.getElementById("app-modal"));
  }, []);
  return (
    element &&
    createPortal(
      visible ? (
        <div className={style.modalwrapper}>
          {
            // eslint-disable-next-line react/no-children-prop
            createElement(focusTrap ? FocusTrap : Fragment, {
              children: (
                <div
                  className={style.modalcontent}
                  role={isDialog ? "alertdialog" : "alert"}
                >
                  {children}
                </div>
              )
            })
          }
        </div>
      ) : null,
      element
    )
  );
};

export default Modal;
