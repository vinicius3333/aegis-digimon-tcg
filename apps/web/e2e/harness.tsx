// Served only by the test Vite server; never imported by the product entry point.
import { createRoot } from "react-dom/client";
import { Client, type Room } from "colyseus.js";
import type { GameState } from "@aegis/shared";
import { GameScreen } from "../src/game/GameScreen";
import { I18nProvider } from "../src/i18n";
import type { AegisJoinOptions } from "../src/net/types";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

declare global {
  interface Window {
    browserTestOptions: AegisJoinOptions & { seed: number };
    browserTestSnapshot: () => ReturnType<GameState["toJSON"]>;
  }
}
// Observe the actual connection, including the replacement created by page reload.
// The browser bridge exposes a snapshot only, never an intent sender or state setter.
for (const method of ["joinOrCreate", "create", "reconnect"] as const) {
  const original = Client.prototype[method];
  Client.prototype[method] = async function (this: Client, ...args: unknown[]) {
    const room = (await (original as Function).apply(this, args)) as Room<GameState>;
    window.browserTestSnapshot = () => room.state.toJSON();
    return room;
  } as typeof original;
}
createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <GameScreen
      joinOptions={window.browserTestOptions}
      identityColor="Red"
      startMode={window.browserTestOptions.devScenario ? "bot" : "casual"}
      onExit={() => {}}
    />
  </I18nProvider>,
);
