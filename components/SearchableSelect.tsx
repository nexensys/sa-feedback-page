import style from "@styles/Select.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReactElement } from "react";
import { buttonProps } from "../common/util";
import { useClickAway } from "../common/hooks";

interface SearchableSelectProps<T> {
  className?: string;
  ItemComponent: React.FC<{
    item: T;
    name: string;
  }>;
  options: {
    value: T;
    name: string;
    matchStrings: string[];
  }[];
  defaultSelectedIdx?: number | null;
  onChange?: (value: T | null, selected: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  viewportBounds?: boolean;
  selected?: number | null;
}

type SearchableSelectComponent = <T = string>(
  props: SearchableSelectProps<T>,
  context?: any
) => ReactElement<SearchableSelectProps<T>, any> | null;

const SearchableSelect: SearchableSelectComponent = ({
  className,
  ItemComponent,
  options,
  defaultSelectedIdx,
  onChange,
  placeholder,
  allowClear = true,
  viewportBounds = false
}) => {
  const [selectedidx, setSelected] = useState(defaultSelectedIdx ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useClickAway<HTMLDivElement>(() => setMenuOpen(false));
  const [viewportY, setViewportY] = useState(0);
  const observer = useMemo(
    () =>
      new MutationObserver(() => {
        setViewportY(
          ref.current ? ref.current.getBoundingClientRect().bottom : 0
        );
      }),
    []
  );

  useEffect(() => {
    if (viewportBounds && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setViewportY(rect.bottom);
      observer.observe(ref.current, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    return () => observer.disconnect();
  }, [ref, observer, viewportBounds, setViewportY]);

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!menuOpen) setQuery("");
  }, [menuOpen, setQuery]);

  return (
    <div
      className={`${style.container} ${className || ""}`}
      {...buttonProps((e) => {
        if (!(e.target as HTMLElement).closest(`.${style.menucontainer}`))
          setMenuOpen((open) => !open);
      })}
      ref={containerRef}
      role="listbox"
    >
      <div className={style.selected} ref={ref} data-open={menuOpen}>
        {selectedidx === null ? (
          <div className={style.placeholder}>{placeholder ?? ""}</div>
        ) : (
          <ItemComponent
            item={options[selectedidx].value}
            name={options[selectedidx].name}
          />
        )}
      </div>
      <div
        className={style.menucontainer}
        style={{ visibility: menuOpen ? "visible" : "collapse" }}
      >
        <div
          className={style.menu}
          style={{
            maxHeight: `calc(100vh - ${viewportY}px)`
          }}
        >
          <input
            className={style.searchbar}
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
          <div className={style.scrollarea}>
            {allowClear && !query ? (
              <div
                className={style.menuitem}
                {...buttonProps((e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected(null);
                  onChange?.(null, null);
                  setMenuOpen(false);
                })}
              >
                {placeholder}
              </div>
            ) : null}
            {options
              .filter(({ matchStrings }) =>
                query
                  ? matchStrings.some((str) =>
                      str.toLowerCase().includes(query.toLowerCase())
                    )
                  : true
              )
              .map(({ value, name }, idx) => (
                <div
                  key={idx}
                  className={style.menuitem}
                  {...buttonProps((e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelected(idx);
                    onChange?.(options[idx].value, idx);
                    setMenuOpen(false);
                  })}
                  data-selected={selectedidx === idx}
                  role="listitem"
                >
                  <ItemComponent item={value} name={name} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchableSelect;
