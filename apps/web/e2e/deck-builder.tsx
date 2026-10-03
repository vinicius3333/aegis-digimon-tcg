// Test-only entry: the real editor, full catalog and production styles.
import { createRoot } from "react-dom/client";
import { DeckBuilder } from "../src/screens/DeckBuilder";
import { createBlankDeck } from "../src/game/decks";
import { I18nProvider } from "../src/i18n";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <DeckBuilder
      decks={[]}
      activeDeckId="custom-1"
      initialEditingDeck={createBlankDeck([], "Red", "Red Hybrid")}
      onSelectDeck={() => {}}
      onSaveDeck={() => {}}
      onDeleteDeck={() => {}}
      onNav={() => {}}
    />
  </I18nProvider>,
);
