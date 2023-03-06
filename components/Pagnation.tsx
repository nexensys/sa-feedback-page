import { Icon } from "@iconify/react";
import style from "@styles/Pagnation.module.css";
import { useEffect, useState } from "react";
import { buttonProps } from "@common/util";
import { useRouter } from "next/router";

const Pagnation: React.FC<{
  allowedAmountsPerPage: number[];
  defaultPostsPerPage: number;
  onPageChange: (page: number, postsPerPage: number) => void;
  minPage?: number;
  maxPage?: number;
  page?: number;
}> = ({
  allowedAmountsPerPage,
  onPageChange,
  minPage = 1,
  maxPage = Infinity,
  page = -1,
  defaultPostsPerPage
}) => {
  const [postsPerPage, setPostsPerPage] = useState(defaultPostsPerPage);
  useEffect(() => {
    if (!allowedAmountsPerPage.includes(postsPerPage))
      setPostsPerPage(defaultPostsPerPage);
  }, [
    allowedAmountsPerPage,
    postsPerPage,
    setPostsPerPage,
    defaultPostsPerPage
  ]);

  const [internalPage, setPage] = useState(
    Math.min(maxPage, Math.max(minPage, page))
  );

  const router = useRouter();

  useEffect(() => {
    onPageChange(internalPage, postsPerPage);
  }, [internalPage, postsPerPage, onPageChange]);

  return (
    <div className={style.pagecontrols}>
      <label className={style.dropdown}>
        <p>Amount per page: </p>
        <div>
          <select
            value={postsPerPage}
            onChange={(e) => setPostsPerPage(parseInt(e.currentTarget.value))}
          >
            {allowedAmountsPerPage.map((val) => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>
      </label>
      <div className={style.pagenavwrapper}>
        <div className={style.pagenav}>
          <Icon
            icon="uil:angle-left-b"
            height="1.2em"
            width="1.2em"
            className={style.pagenavarrow}
            {...buttonProps(() => setPage(Math.max(1, internalPage - 1)))}
          />
          <input
            type="number"
            value={internalPage}
            min={minPage}
            max={maxPage}
            minLength={1}
            onChange={(e) => {
              if (e.currentTarget.validity.valid)
                setPage(parseInt(e.currentTarget.value));
            }}
          />
          <Icon
            icon="uil:angle-right-b"
            height="1.2em"
            width="1.2em"
            className={style.pagenavarrow}
            {...buttonProps(() => setPage(internalPage + 1))}
          />
        </div>
      </div>
    </div>
  );
};

export default Pagnation;
