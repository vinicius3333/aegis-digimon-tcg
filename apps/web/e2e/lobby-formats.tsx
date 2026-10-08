// Test-only entry: production lobby with reproducible legal and incompatible decks.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Lobby } from "../src/screens/Lobby";
import { createBlankDeck, type DeckListing } from "../src/game/decks";
import { I18nProvider } from "../src/i18n";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

const eosmon: DeckListing = {
  ...createBlankDeck([], "Green", "Eosmon"),
  id: "eosmon",
  mainDeck: Array<string>(50).fill("BT6-085"),
  eggDeck: Array<string>(4).fill("BT1-002"),
  format: "BT13:pauper",
};
const banned: DeckListing = {
  ...eosmon,
  id: "banned",
  name: "Historical banned card",
  format: "BT13:unlimited",
  mainDeck: ["BT5-109", ...eosmon.mainDeck.slice(1)],
};
const later: DeckListing = {
  ...eosmon,
  id: "later",
  name: "Later set card",
  mainDeck: ["BT14-033", ...eosmon.mainDeck.slice(1)],
};

function FormatLobby() {
  const [activeDeckId, setActiveDeckId] = useState(eosmon.id);
  const [request, setRequest] = useState("");
  return (
    <I18nProvider>
      <Lobby
        player={{ name: "Format Tester", color: "Green", shards: 0 }}
        decks={[eosmon, banned, later]}
        activeDeckId={activeDeckId}
        onSelectDeck={setActiveDeckId}
        onCopyDeck={() => {}}
        onNav={() => {}}
        onStart={(...args) => setRequest(JSON.stringify(args))}
      />
      <output role="status" aria-label="Match request" className="aegis-sr-only">
        {request}
      </output>
    </I18nProvider>
  );
}
createRoot(document.getElementById("root")!).render(<FormatLobby />);
