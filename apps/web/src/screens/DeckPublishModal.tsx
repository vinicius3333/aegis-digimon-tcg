import { useState } from "react";
import type { PublishOutcome } from "../community/useCommunityPublications";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import type { DeckListing } from "../game/decks";
import { useTranslation, type TranslationKey } from "../i18n";

export type PublishMode = "publish" | "update" | "unpublish";

const COPY: Record<PublishMode, { title: TranslationKey; body: TranslationKey; confirm: TranslationKey }> = {
  publish: {
    title: "community.publish.title",
    body: "community.publish.body",
    confirm: "community.publish.action",
  },
  update: {
    title: "community.publish.updateTitle",
    body: "community.publish.updateBody",
    confirm: "community.publish.update",
  },
  unpublish: {
    title: "community.publish.unpublishTitle",
    body: "community.publish.unpublishBody",
    confirm: "community.publish.unpublish",
  },
};

const ERRORS: Record<Exclude<PublishOutcome, { ok: true }>["error"], TranslationKey> = {
  deck_not_found: "community.publish.errorGeneric",
  deck_not_legal: "community.publish.errorNotLegal",
  name_not_allowed: "community.publish.errorName",
  deck_hidden: "community.publish.errorHidden",
  failed: "community.publish.errorGeneric",
};

export function DeckPublishModal({
  deck,
  mode,
  onPublish,
  onUnpublish,
  onClose,
}: {
  deck: DeckListing;
  mode: PublishMode;
  onPublish: (deck: DeckListing) => Promise<PublishOutcome>;
  onUnpublish: (deckId: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey>();
  const copy = COPY[mode];

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    if (mode === "unpublish") {
      if (await onUnpublish(deck.id)) onClose();
      else setError("community.publish.errorGeneric");
    } else {
      const outcome = await onPublish(deck);
      if (outcome.ok) onClose();
      else setError(ERRORS[outcome.error]);
    }
    setBusy(false);
  };

  return (
    <div className="deck-modal-layer" role="dialog" aria-modal="true" aria-labelledby="deck-publish-title">
      <div className="deck-modal">
        <h2 id="deck-publish-title" className="deck-modal__title">
          {t(copy.title, { name: deck.name })}
        </h2>
        <p className="deck-modal__hint">{t(copy.body)}</p>
        {mode === "publish" ? <p className="deck-modal__hint">{t("community.publish.rules")}</p> : null}
        {error ? (
          <p className="deck-modal__error" role="alert">
            {t(error)}
          </p>
        ) : null}
        <div className="deck-modal__actions">
          <Button variant="secondary" size="sm" autoFocus onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={mode === "unpublish" ? "danger" : "primary"}
            size="sm"
            icon={mode === "unpublish" ? undefined : Icons.Users}
            disabled={busy}
            onClick={confirm}
          >
            {t(copy.confirm)}
          </Button>
        </div>
      </div>
    </div>
  );
}
