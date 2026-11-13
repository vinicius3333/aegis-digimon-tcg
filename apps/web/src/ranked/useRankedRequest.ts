import { useEffect, useState } from "react";
import { AccountApiError, request } from "@/account/client";

type RankedRequestOptions = { poll?: boolean };

export function useRankedRequest<T>(path: string | null, { poll = true }: RankedRequestOptions = {}) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ path: string | null; data?: T; error: boolean; errorCode?: string }>({
    path,
    error: false,
  });
  useEffect(() => {
    let active = true;
    async function load() {
      if (!path) {
        return;
      }
      try {
        const data = await request<T>(path);
        if (active) {
          setState({ path, data, error: false });
        }
      } catch (failure) {
        if (active) {
          setState({ path, error: true, errorCode: failure instanceof AccountApiError ? failure.code : undefined });
        }
      }
    }
    void load();
    const timer = path && poll ? setInterval(() => void load(), 30_000) : undefined;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [path, poll, version]);
  const current = state.path === path ? state : { error: false, data: undefined, errorCode: undefined };
  return { ...current, refresh: () => setVersion((value) => value + 1) };
}
