import { useBattlefieldStyle } from "../../../design/battlefield";

/** The frame the board renders into while waiting/connecting (so overlays have a stage). */
export function BoardShell({ children }: { children: React.ReactNode }) {
  const surface = useBattlefieldStyle();
  return <div style={{ height: "100%", position: "relative", ...surface }}>{children}</div>;
}
