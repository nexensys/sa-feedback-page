import style from "@styles/AccountSettings.module.css";
import { useState } from "react";
import { useRouterAndServerPropsRefresh } from "../common/hooks";

const AccountSettings: React.FC<{ anonymous: boolean }> = ({ anonymous }) => {
  const [isAnonymous, setAnonymous] = useState(anonymous);
  const [router, refresh] = useRouterAndServerPropsRefresh();
  return (
    <div className={style.wrapper}>
      <h1 className={style.title}>Account Settings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetch("/sessions/update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ anonymous: isAnonymous })
          }).then(() => refresh());
        }}
        className={style.form}
      >
        <label className={style.check}>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setAnonymous(e.currentTarget.checked)}
          />
          Keep me anonymous
        </label>
        <button type="submit" className={style.button}>
          Save
        </button>
      </form>
    </div>
  );
};

export default AccountSettings;
