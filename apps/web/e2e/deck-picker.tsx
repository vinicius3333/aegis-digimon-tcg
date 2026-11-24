// Test-only entry for the real lobby picker and preset catalog.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DeckPicker } from "../src/screens/DeckPicker";
import { I18nProvider } from "../src/i18n";
import "../src/design/tokens.css";
import "../src/design/base.css";
import "../src/design/layout.css";
import "../src/design/primitives.css";

function Picker() {
  const [activeDeckId, onSelectDeck] = useState("");
  return (
    <DeckPicker
      ownDecks={[]}
      activeDeckId={activeDeckId}
      randomSelected={false}
      randomPoolSize={0}
      onSelectRandom={() => {}}
      onSelectDeck={onSelectDeck}
      onCopyDeck={() => {}}
      onViewDeck={() => {}}
      onEditDeck={() => {}}
      onBuildDeck={() => {}}
      onPickCommunityDeck={() => {}}
      onOpenCommunityDeck={() => {}}
      accountId={undefined}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <Picker />
  </I18nProvider>,
);
