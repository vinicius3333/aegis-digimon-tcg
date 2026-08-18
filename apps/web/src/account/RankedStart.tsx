import { useEffect, useState } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { accountApi } from "./client";

const CONFIRMATION_KEY = "aegis-ranked-confirmed";

export function RankedStart({ disabled, buttonLabel, actionClassName, onOpenSettings, onStart }: { disabled: boolean; buttonLabel: string; actionClassName?: string; onOpenSettings: () => void; onStart: (ranked: boolean) => void }) {
  const { t } = useTranslation();
  const [ranked, setRanked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean>();
  useEffect(() => { void accountApi.me().then((account) => setAuthenticated(account !== null)).catch(() => setAuthenticated(false)); }, []);
  async function begin() {
    setError(false);
    if (ranked) {
      const account = await accountApi.me().catch(() => null);
      if (!account) { setError(true); return; }
    }
    if (ranked && localStorage.getItem(CONFIRMATION_KEY) !== "1") setConfirming(true); else onStart(ranked);
  }
  function confirm() { if (skipNextTime) localStorage.setItem(CONFIRMATION_KEY, "1"); setConfirming(false); onStart(true); }
  return <>
    <div style={{ position: "relative", marginBottom: 12, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--ds-border)", background: "var(--ds-surface-muted)" }}>
      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "var(--ds-foreground)", opacity: authenticated ? 1 : 0.45 }}>
        <input type="checkbox" disabled={!authenticated} checked={ranked} onChange={(event) => setRanked(event.target.checked)} style={{ marginTop: 2 }} />
        <span><strong>{t("ranked.checkboxTitle")}</strong><span style={{ display: "block", fontSize: 11.5, color: "var(--ds-foreground-muted)", marginTop: 2 }}>{t("ranked.checkboxDescription")}</span></span>
      </label>
      {authenticated === false ? <button type="button" onClick={onOpenSettings} style={{ marginTop: 9, width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--ds-border)", background: "var(--ds-surface)", color: "var(--ds-foreground)", cursor: "pointer", fontWeight: 700 }}>{t("ranked.signInToEnable")}</button> : null}
    </div>
    <div className={actionClassName}>
      <Button size="lg" full icon={Icons.Swords} disabled={disabled} onClick={() => void begin()}>{buttonLabel}</Button>
    </div>
    {error ? <div role="alert" style={{ marginTop: 8, fontSize: 12, color: "var(--ds-danger, #b42318)" }}>{t("ranked.signInFirst")}</div> : null}
    {confirming ? <div role="dialog" aria-modal="true" aria-labelledby="ranked-title" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.55)" }}>
      <div style={{ width: "min(420px, 100%)", padding: 22, borderRadius: 18, background: "var(--ds-surface)", border: "1px solid var(--ds-border)", boxShadow: "var(--ds-shadow-lg)" }}>
        <strong id="ranked-title" style={{ fontSize: 19, color: "var(--ds-foreground)" }}>{t("ranked.confirmTitle")}</strong>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ds-foreground-muted)" }}>{t("ranked.confirmBody")}</p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ds-foreground)" }}><input type="checkbox" checked={skipNextTime} onChange={(event) => setSkipNextTime(event.target.checked)} /> {t("ranked.dontShowAgain")}</label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>{t("common.cancel")}</Button><Button size="sm" onClick={confirm}>{t("common.confirm")}</Button></div>
      </div>
    </div> : null}
  </>;
}
