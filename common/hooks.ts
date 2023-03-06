import { NextRouter, useRouter } from "next/router";
import {
  useRef,
  useEffect,
  useState,
  EffectCallback,
  DependencyList,
  useCallback
} from "react";

export const usePrevious = <T = any>(value: T, initialValue: T) => {
  const ref = useRef<T>(initialValue);

  useEffect(() => {
    ref.current = value;
  }, [ref, value]);

  return ref.current!;
};

export const useConditionalChangeEffect = (
  callback: (changes: boolean[]) => ReturnType<EffectCallback>,
  deps: DependencyList
) => {
  const prevDepsRef = useRef(deps);

  useEffect(() => {
    const prevDeps = prevDepsRef.current;
    const changes = deps?.map((dep, idx) => dep !== prevDeps[idx]) || [];
    prevDepsRef.current = deps;
    return callback(changes);
  }, deps);
};

export const useMountSafeguard = () => {
  const [isMounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return isMounted;
};

export const useClickAway = <T extends HTMLElement = HTMLElement>(
  listener: () => void,
  capture = false
) => {
  const ref = useRef<T>(null);
  useEffect(() => {
    const wrappedListener = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as HTMLElement)) listener();
    };
    window.addEventListener("mousedown", wrappedListener, {
      capture
    });

    return () => {
      window.removeEventListener("mousedown", wrappedListener, {
        capture
      });
    };
  }, [listener, ref, capture]);

  return ref;
};

export const useRouterAndServerPropsRefresh = (): [
  NextRouter,
  () => Promise<boolean>
] => {
  const router = useRouter();
  const refresh = useCallback(() => router.replace(router.asPath), [router]);

  return [router, refresh];
};
