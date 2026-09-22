/* Import and export a deck as text. */

import { useState } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import type { DeckListing } from "../game/decks";

/* ---------------- import / export modals ---------------- */
const modalOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 50,
  background: "rgba(15,23,42,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalPanel: React.CSSProperties = {
  background: "var(--ds-surface)",
  border: "1px solid var(--ds-border)",
  borderRadius: 18,
  padding: 28,
  width: 480,
  maxWidth: "90%",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "var(--ds-shadow-lg)",
};

const modalTextarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 280,
  padding: 12,
  borderRadius: 10,
  border: "1px solid var(--ds-border-strong)",
  background: "var(--ds-surface-muted)",
  color: "var(--ds-foreground)",
  fontFamily: "var(--ds-font-mono)",
  fontSize: 12.5,
  lineHeight: 1.6,
  resize: "none",
  outline: "none",
};

export function DeckImportModal({ onImport, onClose }: { onImport: (text: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  return (
    <div style={modalOverlay}>
      <div style={modalPanel}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--ds-font-display)",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--ds-foreground)",
          }}
        >
          {t("deck.importTitle")}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ds-foreground-muted)" }}>
          {t("deck.importHint")}{" "}
          <code style={{ background: "var(--ds-surface-muted)", padding: "1px 5px", borderRadius: 4 }}>
            4 CardName BT1-009
          </code>
        </p>
        <textarea
          style={modalTextarea}
          autoFocus
          placeholder={"// DigimonCard.io Deck List\n4 Agumon BT1-009\n…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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

export function DeckExportModal({ text: deckText, onClose }: { text: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(deckText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={modalOverlay}>
      <div style={modalPanel}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--ds-font-display)",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--ds-foreground)",
          }}
        >
          {t("deck.exportTitle")}
        </h2>
        <textarea
          style={modalTextarea}
          readOnly
          value={deckText}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button size="sm" icon={copied ? Icons.Check : Icons.Download} onClick={copy}>
            {copied ? t("common.copied") : t("common.copy")}
          </Button>
        </div>
      </div>
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
    <div style={modalOverlay} role="dialog" aria-modal="true" aria-labelledby="deck-delete-title">
      <div style={modalPanel}>
        <h2
          id="deck-delete-title"
          style={{
            margin: 0,
            fontFamily: "var(--ds-font-display)",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--ds-foreground)",
          }}
        >
          {t("deck.deleteTitle", { name: deck.name })}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ds-foreground-muted)" }}>{t("deck.deleteHint")}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
