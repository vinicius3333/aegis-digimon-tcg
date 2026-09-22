/* Read-only card list for a famous preset, opened from the lobby. Lets a player
   inspect a tournament list before playing it, without copying it first. */

import { useEffect, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { getCardDefinition } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { Button, Dialog, Eyebrow, IconButton } from "../design/primitives";
import { Icons } from "../design/icons";
import { kindOf } from "../design/theme";
import type { DeckListing } from "../game/decks";
import { useTranslation, type Translate } from "../i18n";
import { sortCardIds } from "./cardSorting";
import "./famousDeckListDialog.css";

interface DeckSection {
  id: string;
  label: string;
  entries: { cardId: string; count: number }[];
}

function countCopies(cardIds: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const cardId of cardIds) counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  return counts;
}

function toEntries(counts: Map<string, number>, cardIds: string[]) {
  return sortCardIds(cardIds).map((cardId) => ({ cardId, count: counts.get(cardId) ?? 0 }));
}

function totalOf(entries: { count: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

export function famousDeckSections(deck: DeckListing, t: Translate): DeckSection[] {
  const mainCounts = countCopies(deck.mainDeck);
  const eggCounts = countCopies(deck.eggDeck);
  const byLevel = new Map<number, string[]>();
  const tamers: string[] = [];
  const options: string[] = [];
  const other: string[] = [];

  for (const cardId of mainCounts.keys()) {
    const definition = getCardDefinition(cardId);
    const kind = definition ? kindOf(definition) : undefined;
    if (kind === "Tamer") tamers.push(cardId);
    else if (kind === "Option") options.push(cardId);
    else if (kind === "Digimon" && definition?.level != null) {
      const cards = byLevel.get(definition.level) ?? [];
      cards.push(cardId);
      byLevel.set(definition.level, cards);
    } else other.push(cardId);
  }

  const eggEntries = toEntries(eggCounts, [...eggCounts.keys()]);
  const sections: DeckSection[] = [
    { id: "eggs", label: t("deck.eggSection", { count: totalOf(eggEntries) }), entries: eggEntries },
    ...[...byLevel.entries()]
      .sort(([a], [b]) => a - b)
      .map(([level, cardIds]) => {
        const entries = toEntries(mainCounts, cardIds);
        return { id: `level-${level}`, label: t("deck.levelSection", { level, count: totalOf(entries) }), entries };
      }),
  ];
  const tamerEntries = toEntries(mainCounts, tamers);
  sections.push({ id: "tamers", label: t("deck.tamerSection", { count: totalOf(tamerEntries) }), entries: tamerEntries });
  const optionEntries = toEntries(mainCounts, options);
  sections.push({
    id: "options",
    label: t("deck.optionSection", { count: totalOf(optionEntries) }),
    entries: optionEntries,
  });
  const otherEntries = toEntries(mainCounts, other);
  sections.push({ id: "other", label: t("deck.otherSection", { count: totalOf(otherEntries) }), entries: otherEntries });
  return sections.filter((section) => section.entries.length > 0);
}

/* Full-screen look at one card. Lives outside the dialog's portal so it paints
   above the dialog; key events still bubble through React to the dialog, so
   Escape is stopped here to close only the lightbox. */
function CardLightbox({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.getElementById("famous-deck-lightbox")?.focus();
    return () => previousFocus?.focus();
  }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };
  const name = getCardDefinition(cardId)?.nameEn ?? cardId;
  return createPortal(
    <div
      id="famous-deck-lightbox"
      className="famous-deck-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={name}
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className="famous-deck-lightbox__card" onClick={(event) => event.stopPropagation()}>
        <CardFull cardId={cardId} width={LIGHTBOX_CARD_WIDTH} zoomOnHover={false} />
      </div>
      <button type="button" className="famous-deck-lightbox__close" aria-label={t("common.close")} onClick={onClose}>
        <Icons.X size={22} />
      </button>
    </div>,
    document.body,
  );
}

const LIGHTBOX_CARD_WIDTH = Math.min(420, Math.round(window.innerWidth * 0.86), Math.round((window.innerHeight * 0.8) / 1.4));

export function FamousDeckListDialog({
  deck,
  collection,
  active,
  onUse,
  onCopy,
  onClose,
}: {
  deck: DeckListing;
  collection: string;
  active: boolean;
  onUse: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sections = famousDeckSections(deck, t);
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);

  return (
    <Dialog className="famous-deck-dialog" labelledBy="famous-deck-dialog-title" onClose={onClose}>
      <header className="famous-deck-dialog__header">
        <div>
          <Eyebrow>{t("lobby.famousDeckEyebrow")}</Eyebrow>
          <h2 id="famous-deck-dialog-title" className="famous-deck-dialog__title">
            {deck.name}
            <span className="famous-deck-dialog__collection">{collection}</span>
          </h2>
          <p className="famous-deck-dialog__meta">
            {t("lobby.famousDeckCards", { main: deck.mainDeck.length, egg: deck.eggDeck.length })}
          </p>
        </div>
        <IconButton variant="ghost" size="sm" label={t("common.close")} onClick={onClose}>
          <Icons.X size={18} />
        </IconButton>
      </header>
      <div className="famous-deck-dialog__sections">
        {sections.map((section) => (
          <section key={section.id} className="famous-deck-dialog__section" aria-label={section.label}>
            <h3 className="famous-deck-dialog__section-title">{section.label}</h3>
            <ul className="famous-deck-dialog__cards">
              {section.entries.map(({ cardId, count }) => (
                <li key={cardId} className="famous-deck-dialog__card">
                  <button
                    type="button"
                    className="famous-deck-dialog__card-button"
                    aria-label={getCardDefinition(cardId)?.nameEn ?? cardId}
                    onClick={() => setInspectedCardId(cardId)}
                  >
                    <CardFull cardId={cardId} width={72} zoomOnHover />
                    <span className="famous-deck-dialog__count">×{count}</span>
                  </button>
                  <span className="famous-deck-dialog__card-name" aria-hidden="true">
                    {getCardDefinition(cardId)?.nameEn ?? cardId}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className="famous-deck-dialog__actions">
        <Button variant="secondary" icon={Icons.FileText} onClick={onCopy}>
          {t("lobby.copyPreset")}
        </Button>
        <Button icon={active ? Icons.Check : Icons.Swords} disabled={active} onClick={onUse}>
          {active ? t("deck.active") : t("lobby.useDeck")}
        </Button>
      </footer>
      {inspectedCardId ? <CardLightbox cardId={inspectedCardId} onClose={() => setInspectedCardId(null)} /> : null}
    </Dialog>
  );
}
