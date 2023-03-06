import style from "@styles/Select.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReactElement } from "react";
import { buttonProps } from "../common/util";
import { useClickAway } from "../common/hooks";

interface MultiSelectProps<T> {
  className?: string;
  ItemComponent: React.FC<{
    item: T;
    name: string;
  }>;
  options: {
    value: T;
    name: string;
  }[];
  defaultSelectedIdxs?: number[];
  onChange?: (values: T[], selected: number[]) => void;
  placeholder?: string;
  allowClear?: boolean;
  viewportBounds?: boolean;
  selected?: number[];
}

type MultiSelectComponent = <T = string>(
  props: MultiSelectProps<T>,
  context?: any
) => ReactElement<MultiSelectProps<T>, any> | null;

const MultiSelect: MultiSelectComponent = ({
  className,
  ItemComponent,
  options,
  defaultSelectedIdxs,
  onChange,
  placeholder,
  allowClear = true,
  viewportBounds = false
}) => {
  const [selectedidxs, setSelected] = useState(defaultSelectedIdxs ?? []);
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

  useEffect(() => {
    onChange?.(
      selectedidxs.map((idx) => options[idx].value),
      selectedidxs
    );
  }, [selectedidxs, options]);

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
        {selectedidxs.length === 0 ? (
          <div className={style.placeholder}>{placeholder ?? ""}</div>
        ) : (
          <div className={style.selecteditems}>
            {selectedidxs.map((selectedidx) => (
              <ItemComponent
                key={selectedidx}
                item={options[selectedidx].value}
                name={options[selectedidx].name}
              />
            ))}
          </div>
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
          <div className={style.scrollarea}>
            {allowClear ? (
              <div
                className={style.menuitem}
                {...buttonProps((e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected([]);
                  onChange?.([], []);
                  setMenuOpen(false);
                })}
              >
                {placeholder}
              </div>
            ) : null}
            {options.map(({ value, name }, idx) => (
              <div
                key={idx}
                className={style.menuitem}
                {...buttonProps((e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelected((selected) =>
                    selected.includes(idx)
                      ? selected.filter((i) => i !== idx)
                      : [...new Set([...selected, idx])]
                  );
                  setMenuOpen(false);
                })}
                data-selected={selectedidxs.includes(idx)}
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

export default MultiSelect;
