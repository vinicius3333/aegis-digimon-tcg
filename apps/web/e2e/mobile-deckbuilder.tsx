// The production app shell and deck screens, with a reproducible unfinished deck.
import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { AegisClient } from "../src/App";
import { createBlankDeck, type DeckListing } from "../src/game/decks";
import { I18nProvider } from "../src/i18n";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

const initialDeck: DeckListing = {
  ...createBlankDeck([], "Red", "Novo deck"),
  mainDeck: [
    ...Array<string>(3).fill("BT1-009"),
    ...Array<string>(4).fill("BT1-015"),
    ...Array<string>(4).fill("BT1-020"),
    ...Array<string>(4).fill("BT1-025"),
  ],
  eggDeck: Array<string>(4).fill("BT1-002"),
};

function MobileDeckbuilder() {
  const [decks, setDecks] = useState([initialDeck]);
  const [activeDeckId, setActiveDeckId] = useState("");
  const [player, setPlayer] = useState({ name: "Mobile Tamer", color: "Red", shards: 0 });
  const [dark, setDark] = useState(false);
  const saveDeck = useCallback((deck: DeckListing) => {
    setDecks((current) => [...current.filter((saved) => saved.id !== deck.id), deck]);
  }, []);
  return (
    <I18nProvider>
      <div className="aegis-app-viewport">
        <AegisClient
          player={player}
          setPlayer={setPlayer}
          decks={decks}
          activeDeckId={activeDeckId}
          setActiveDeckId={setActiveDeckId}
          saveDeck={saveDeck}
          deleteDeck={(id) => setDecks((current) => current.filter((deck) => deck.id !== id))}
          dark={dark}
          setDark={setDark}
          initialScreen="deck"
        />
      </div>
    </I18nProvider>
  );
}
createRoot(document.getElementById("root")!).render(<MobileDeckbuilder />);
