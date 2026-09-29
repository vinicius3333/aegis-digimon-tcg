/* Import and export a deck as text. */

import { useState } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import type { DeckListing } from "../game/decks";
import { DeckImageButton } from "./DeckImageButton";
import { useDeckImagePreview } from "./useDeckImagePreview";
import "./deckExportModal.css";

/* ---------------- import / export modals ---------------- */
export function DeckImportModal({ onImport, onClose }: { onImport: (text: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  return (
    <div className="deck-modal-layer" role="dialog" aria-modal="true" aria-labelledby="deck-import-title">
      <div className="deck-modal">
        <h2 id="deck-import-title" className="deck-modal__title">
          {t("deck.importTitle")}
        </h2>
        <p className="deck-modal__hint">
          {t("deck.importHint")} <code>4 CardName BT1-009</code>
        </p>
        <textarea
          className="deck-modal__textarea"
          autoFocus
          placeholder={"// DigimonCard.io Deck List\n4 Agumon BT1-009\n…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="deck-modal__actions">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" icon={Icons.Upload} disabled={!text.trim()} onClick={() => onImport(text)}>
            {t("common.import")}
          </Button>
        </div>
      </div>
    </div>
  );
}

type ExportTab = "text" | "image";

export function DeckExportModal({
  text: deckText,
  deck,
  onClose,
}: {
  text: string;
  deck?: DeckListing;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<ExportTab>("text");
  const copy = () => {
    navigator.clipboard.writeText(deckText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="deck-modal-layer" role="dialog" aria-modal="true" aria-labelledby="deck-export-title">
      <div className="deck-modal deck-export-modal">
        <h2 id="deck-export-title" className="deck-modal__title">
          {t("deck.exportTitle")}
        </h2>
        {deck ? (
          <div className="deck-export-modal__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "text"}
              className="deck-export-modal__tab"
              onClick={() => setTab("text")}
            >
              <Icons.FileText size={15} />
              {t("deck.exportTabText")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "image"}
              className="deck-export-modal__tab"
              onClick={() => setTab("image")}
            >
              <Icons.Download size={15} />
              {t("deck.exportTabImage")}
            </button>
          </div>
        ) : null}
        {tab === "image" && deck ? (
          <DeckImagePreview deck={deck} />
        ) : (
          <textarea
            className="deck-modal__textarea"
            readOnly
            value={deckText}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        )}
        <div className="deck-export-modal__actions">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
          <span className="deck-export-modal__spacer" />
          {tab === "image" && deck ? (
            <DeckImageButton deck={deck} size="sm" variant="primary" label={t("deck.exportDownloadPng")} />
          ) : (
            <Button size="sm" icon={copied ? Icons.Check : Icons.Copy} onClick={copy}>
              {copied ? t("common.copied") : t("common.copy")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeckImagePreview({ deck }: { deck: DeckListing }) {
  const { t } = useTranslation();
  const preview = useDeckImagePreview(deck);
  return (
    <div className="deck-export-modal__preview" aria-busy={preview.status === "loading"}>
      {preview.status === "ready" ? (
        <img src={preview.url} alt={t("deck.exportPreviewAlt", { name: deck.name })} />
      ) : (
        <span className="deck-export-modal__preview-status">
          {preview.status === "failed" ? t("deck.exportImageFailed") : t("deck.exportImageRendering")}
        </span>
      )}
      {preview.status === "ready" ? (
        <span className="deck-export-modal__preview-meta">
          {t("deck.exportPreviewMeta", {
            width: preview.width,
            height: preview.height,
          })}
        </span>
      ) : null}
    </div>
  );
}

export function DeckDeleteModal({
  deck,
  onConfirm,
  onClose,
}: {
  deck: DeckListing;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="deck-modal-layer" role="dialog" aria-modal="true" aria-labelledby="deck-delete-title">
      <div className="deck-modal">
        <h2 id="deck-delete-title" className="deck-modal__title">
          {t("deck.deleteTitle", { name: deck.name })}
        </h2>
        <p className="deck-modal__hint">{t("deck.deleteHint")}</p>
        <div className="deck-modal__actions">
          <Button variant="secondary" size="sm" autoFocus onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" size="sm" icon={Icons.Trash} onClick={onConfirm}>
            {t("deck.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
