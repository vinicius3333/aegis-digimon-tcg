import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DeckList } from "../src/screens/DeckList";
import { createBlankDeck, type DeckListing } from "../src/game/decks";
import { I18nProvider } from "../src/i18n";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

const legalDeck: DeckListing = {
  ...createBlankDeck([], "Green", "Royale"),
  id: "royale",
  mainDeck: Array<string>(50).fill("BT6-085"),
  eggDeck: Array<string>(4).fill("BT1-002"),
  format: "standard",
};
const decks: DeckListing[] = [
  legalDeck,
  { ...legalDeck, id: "etaymon", name: "Etaymon Knightmon" },
  { ...legalDeck, id: "virtual", name: "virtual Proximamon" },
];

function SignedInDeckList() {
  const [activeDeckId, setActiveDeckId] = useState("");
  return (
    <div className="aegis-app-viewport">
      <DeckList
        decks={decks}
        activeDeckId={activeDeckId}
        onEdit={() => {}}
        onNew={() => {}}
        onSelectDeck={setActiveDeckId}
        onDelete={() => {}}
        onPlay={() => {}}
        onTest={() => {}}
        signedIn
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <SignedInDeckList />
  </I18nProvider>,
);
