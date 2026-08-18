import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { APP_VERSION, RELEASE_NOTES } from "../release";
import { useTranslation } from "../i18n";

export function ReleaseNotesButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("release.open", { version: APP_VERSION })}
        style={{ border: "1px solid var(--ds-border)", borderRadius: compact ? 10 : 12, padding: compact ? "7px 10px" : "8px 12px", background: "var(--ds-surface)", color: "var(--ds-foreground-muted)", cursor: "pointer", fontFamily: "var(--ds-font-mono)", fontSize: compact ? 11 : 12, fontWeight: 700 }}
      >
        v{APP_VERSION}
      </button>
      {open ? <ReleaseNotesModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ReleaseNotesModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 130, display: "grid", placeItems: "center", padding: 18, background: "rgba(11,13,20,0.86)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="release-notes-title" style={{ width: "min(560px, 100%)", maxHeight: "min(680px, calc(100vh - 36px))", overflowY: "auto", borderRadius: 22, padding: 22, background: "var(--ds-surface)", border: "1px solid var(--ds-border-strong)", boxShadow: "var(--ds-shadow-lg)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ds-primary)", fontFamily: "var(--ds-font-mono)", fontWeight: 700, fontSize: 12 }}><Icons.ScrollText size={16} />{t("release.eyebrow")}</div>
            <h2 id="release-notes-title" style={{ margin: "7px 0 0", color: "var(--ds-foreground)", fontFamily: "var(--ds-font-display)", fontSize: 25 }}>{t("release.title")}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>{t("common.close")}</Button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {RELEASE_NOTES.map((release) => (
            <article key={release.version} style={{ padding: 16, borderRadius: 16, border: "1px solid var(--ds-border)", background: release.version === APP_VERSION ? "var(--ds-primary-light)" : "var(--ds-surface-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div style={{ color: "var(--ds-foreground)", fontFamily: "var(--ds-font-display)", fontSize: 18, fontWeight: 800 }}>v{release.version}</div>
                <div style={{ color: "var(--ds-foreground-muted)", fontFamily: "var(--ds-font-mono)", fontSize: 11 }}>{release.date}</div>
              </div>
              {release.version === APP_VERSION ? <div style={{ display: "inline-block", marginBottom: 10, color: "var(--ds-primary)", fontFamily: "var(--ds-font-sans)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("release.current")}</div> : null}
              {release.changes.every((change) => /^[A-Z0-9]+-\d+$/u.test(change.description)) ? <div style={{ marginBottom: 7, color: "var(--ds-foreground-muted)", fontFamily: "var(--ds-font-sans)", fontSize: 12, fontWeight: 700 }}>{t("release.changedCards")}</div> : null}
              <ul style={{ display: "flex", flexDirection: "column", gap: 7, padding: 0, margin: 0, listStyle: "none" }}>
                {release.changes.map((change, index) => <li key={`${release.version}-${index}`} style={{ display: "flex", gap: 9, color: "var(--ds-foreground-secondary)", fontSize: 13.5, lineHeight: 1.45 }}><span aria-hidden style={{ color: "var(--ds-primary)", fontWeight: 800 }}>•</span>{change.translations?.[locale] ?? change.description}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}
