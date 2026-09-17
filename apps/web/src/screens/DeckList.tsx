/* The deck picker: every saved deck as a cover card, plus the actions that create,
   duplicate or delete one. */

import { useState } from "react";
import { Button, Eyebrow } from "../design/primitives";
import { Icons } from "../design/icons";
import { createBlankDeck, parseDeckList, type DeckListing } from "../game/decks";
import { DeckListCard, deckLegality } from "./DeckListCard";
import { useTranslation } from "../i18n";
import { DeckImportModal } from "./DeckTextModals";

/* ---------------- deck list ---------------- */
export function DeckList({
  decks,
  activeDeckId,
  onEdit,
  onNew,
  onSelectDeck,
  onPlay,
}: {
  decks: DeckListing[];
  activeDeckId: string;
  onEdit: (deck: DeckListing) => void;
  onNew: () => void;
  onSelectDeck: (id: string) => void;
  onPlay: () => void;
}) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const handleImport = (text: string) => {
    const result = parseDeckList(text);
    const base = createBlankDeck(decks, undefined, t("deck.newDeckName"));
    onEdit({ ...base, mainDeck: result.mainDeck, eggDeck: result.eggDeck });
    setImporting(false);
  };

  return (
    <div
      className="deck-list-page"
      style={{
        position: "relative",
        padding: "28px 32px",
        height: "calc(100% - var(--ds-nav-height-wide))",
        overflowY: "auto",
      }}
    >
      <div
        className="deck-list-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}
      >
        <div>
          <Eyebrow>{t("deck.eyebrow")}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--ds-font-display)",
              fontWeight: 800,
              fontSize: 32,
              margin: "10px 0 0",
              color: "var(--ds-foreground)",
            }}
          >
            {t("deck.title")}
          </h1>
        </div>
        <div className="deck-list-actions" style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" icon={Icons.Upload} onClick={() => setImporting(true)}>
            {t("common.import")}
          </Button>
          <Button icon={Icons.Plus} onClick={onNew}>
            {t("deck.new")}
          </Button>
        </div>
      </div>
      {importing ? <DeckImportModal onImport={handleImport} onClose={() => setImporting(false)} /> : null}
      {decks.length === 0 ? (
        <p className="deck-list-empty" role="status">
          {t("deck.empty")}
        </p>
      ) : null}
      <div className="deck-list-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
        {decks.map((d) => {
          const active = d.id === activeDeckId;
          const { legal } = deckLegality(d);
          return (
            <DeckListCard
              key={d.id}
              deck={d}
              active={active}
              actions={
                <>
                  <Button size="sm" variant="secondary" icon={Icons.FileText} onClick={() => onEdit(d)}>
                    {t("common.edit")}
                  </Button>
                  {active && legal ? (
                    <Button size="sm" icon={Icons.Swords} onClick={onPlay}>
                      {t("common.play")}
                    </Button>
                  ) : legal ? (
                    <Button size="sm" variant="ghost" onClick={() => onSelectDeck(d.id)}>
                      {t("deck.setActive")}
                    </Button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ds-foreground-muted)", fontStyle: "italic" }}>
                      {t("deck.finishToUse")}
                    </span>
                  )}
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
