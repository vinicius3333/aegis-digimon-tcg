import { useEffect, useState } from "react";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "@/i18n/useTranslation";
import { renderDeckImage } from "./deckImageExport";

export type DeckImagePreview =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; url: string; width: number; height: number };

function renderedContent(deck: DeckListing): string {
  return JSON.stringify([deck.name, deck.mainDeck, deck.eggDeck]);
}

export function useDeckImagePreview(deck: DeckListing): DeckImagePreview {
  const { t } = useTranslation();
  const [renderedDeck, setRenderedDeck] = useState(deck);
  const [preview, setPreview] = useState<DeckImagePreview>({
    status: "loading",
  });

  if (renderedContent(renderedDeck) !== renderedContent(deck)) setRenderedDeck(deck);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    setPreview({ status: "loading" });
    renderDeckImage({ deck: renderedDeck, t })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        return createImageBitmap(blob).then((bitmap) => {
          if (cancelled || !objectUrl) return;
          setPreview({
            status: "ready",
            url: objectUrl,
            width: bitmap.width,
            height: bitmap.height,
          });
        });
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: "failed" });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [renderedDeck, t]);

  return preview;
}
