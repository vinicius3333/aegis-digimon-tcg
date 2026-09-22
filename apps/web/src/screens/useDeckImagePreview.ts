/* Renders the deck PNG once per deck change for the export modal preview and
   revokes the object URL when it is replaced or unmounted. */

import { useEffect, useState } from "react";
import type { DeckListing } from "../game/decks";
import { useTranslation } from "../i18n";
import { renderDeckImage } from "./deckImageExport";

export type DeckImagePreview =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; url: string; width: number; height: number };

export function useDeckImagePreview(deck: DeckListing): DeckImagePreview {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<DeckImagePreview>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    setPreview({ status: "loading" });
    renderDeckImage({ deck, t })
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
  }, [deck, t]);

  return preview;
}
