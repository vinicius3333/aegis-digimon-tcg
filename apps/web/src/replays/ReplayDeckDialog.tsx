import type { ReplayDeck } from "@aegis/shared/replays/ReplayDeck";
import { CardFull } from "@/design/cards";
import { Icons } from "@/design/icons";
import { Button, Dialog } from "@/design/primitives";
import type { DeckListing } from "@/game/decks";
import { usedDeckListing } from "@/game/usedDeckListing";
import { useTranslation } from "@/i18n/useTranslation";
import { useId, useState } from "react";

type Params = { deck: ReplayDeck; onCopy?: (deck: DeckListing) => void; onClose: () => void };

export function ReplayDeckDialog({ deck, onCopy, onClose }: Params) {
  const title = useId();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <Dialog labelledBy={title} onClose={onClose} className="replay-deck-dialog">
      <header>
        <h2 id={title}>{deck.deckName}</h2>
        {onCopy ? (
          <Button
            variant="secondary"
            icon={Icons.FileText}
            disabled={copied}
            onClick={() => {
              onCopy(usedDeckListing({ snapshot: { ...deck, deckId: null } }));
              setCopied(true);
            }}
          >
            {copied ? t("common.copied") : t("lobby.copyPreset")}
          </Button>
        ) : null}
        <Button onClick={onClose}>{t("common.close")}</Button>
      </header>
      {[
        { label: t("deck.main"), cards: deck.mainDeck },
        { label: t("deck.egg"), cards: deck.eggDeck },
      ].map(({ label, cards }) => {
        const counts = new Map<string, number>();
        for (const cardId of cards) {
          counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
        }
        return (
          <section key={label}>
            <h3>
              {label} · {cards.length}
            </h3>
            <div className="replay-deck-dialog__cards">
              {[...counts].map(([cardId, count]) => (
                <div key={cardId}>
                  <CardFull cardId={cardId} width={112} />
                  <strong>×{count}</strong>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </Dialog>
  );
}
