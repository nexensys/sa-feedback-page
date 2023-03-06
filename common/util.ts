export function omit<
  T extends Record<string | number | symbol, any>,
  K extends (keyof T)[]
>(obj: T, k: K) {
  return Object.fromEntries(
    Object.entries(obj).filter((e) => !k.includes(e[0]))
  ) as Omit<T, K[number]>;
}

export function buttonProps<T extends Element>(
  listener: (
    e: React.MouseEvent<T, MouseEvent> | React.KeyboardEvent<T>
  ) => void
) {
  return {
    tabIndex: 0,
    role: "button",
    onClick: listener,
    onKeyPress: (e: React.KeyboardEvent<T>) => {
      if (e.key.toLowerCase() !== "enter") return;
      listener(e as React.KeyboardEvent<T>);
    }
  };
}
