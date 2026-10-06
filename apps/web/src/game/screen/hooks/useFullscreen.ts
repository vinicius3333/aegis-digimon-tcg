import { useCallback, useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/**
 * The page's full-screen state. iPhone Safari offers full screen only to video, so
 * `supported` is false there and callers hide the control.
 */
export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const supported = typeof document !== "undefined" && document.fullscreenEnabled === true;
  const toggle = useCallback(() => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen({ navigationUI: "hide" });
    // A refusal (no user gesture, or a policy) leaves the page as it was.
    request.catch(() => undefined);
  }, []);
  return { supported, active, toggle };
}
