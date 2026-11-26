import { createRoot } from "react-dom/client";
import { Lobby } from "@/screens/Lobby";
import { I18nProvider } from "@/i18n/I18nProvider";
import { applyDarkMode } from "@/design/darkMode";
import { loadIdentity } from "@/identity";
import "@/design/tokens.css";
import "@/design/base.css";
import "@/design/layout.css";
import "@/design/primitives.css";
applyDarkMode();
createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <Lobby
      player={loadIdentity()}
      decks={[]}
      activeDeckId=""
      onSelectDeck={() => {}}
      onCopyDeck={() => {}}
      onNav={() => {}}
      onStart={() => {}}
    />
  </I18nProvider>,
);
