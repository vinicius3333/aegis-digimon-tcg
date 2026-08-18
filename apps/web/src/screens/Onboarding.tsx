/* Entry screen: pick a handle + identity color before the menu. */

import { useEffect, useRef, useState } from "react";
import { Button, Logo } from "../design/primitives";
import { Sigil } from "../design/cards";
import { COLORS, COLOR_KEYS, type ColorName } from "../design/theme";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import "./onboarding.css";

const ADJ = ["Ashen", "Verdant", "Cobalt", "Gilded", "Umbral", "Tidal", "Ember", "Storm", "Hollow", "Crimson", "Pale", "Iron", "Lunar", "Vesper", "Onyx", "Dawn"];
const NOUN = ["Warden", "Tamer", "Herald", "Drake", "Sentinel", "Augur", "Knell", "Mourner", "Vow", "Cinder", "Reverie", "Oathkeeper", "Wisp", "Sable", "Quill", "Vane"];

function randomName(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)] ?? "Vesper";
  const n = NOUN[Math.floor(Math.random() * NOUN.length)] ?? "Knell";
  return `${a}${n}`;
}

export function Onboarding({ initialColor = "Blue", onEnter }: { initialColor?: ColorName; onEnter: (id: { name: string; color: ColorName }) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorName>(initialColor);
  const ac = COLORS[color];
  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 16;
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  const submit = () => { if (valid) onEnter({ name: trimmed, color }); };

  return (
    <main className="onboarding-page" style={{ background: `radial-gradient(80% 70% at 50% 0%, ${ac.soft}, rgba(11,13,20,0) 60%), var(--ds-background)` }}>
      <div className="onboarding-sigil onboarding-sigil--large" style={{ position: "absolute", right: -160, bottom: -120, opacity: 0.5, pointerEvents: "none" }}>
        <Sigil emblem="ward" color={color} size={620} faded />
      </div>
      <div className="onboarding-sigil" style={{ position: "absolute", left: -150, top: -110, opacity: 0.35, pointerEvents: "none" }}>
        <Sigil emblem="orb" color={color} size={420} faded />
      </div>

      <section className="onboarding-card" style={{ position: "relative", width: 460, background: "var(--ds-surface)", borderRadius: 28, border: "1px solid var(--ds-border)", boxShadow: "var(--ds-shadow-summary)", padding: 36, animation: "aegis-pop 360ms ease-out both" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={50} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ds-primary)", marginBottom: 8 }}>{t("onboarding.eyebrow")}</div>
          <h1 style={{ fontFamily: "var(--ds-font-display)", fontWeight: 800, fontSize: 28, margin: 0, color: "var(--ds-foreground)", letterSpacing: "-0.01em" }}>{t("onboarding.title")}</h1>
          <p style={{ fontSize: 13.5, color: "var(--ds-foreground-muted)", margin: "8px 0 0" }}>{t("onboarding.subtitle")}</p>
        </div>

        <label htmlFor="onboarding-name" style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-foreground-muted)", marginBottom: 8 }}>{t("onboarding.nickname")}</label>
        <div style={{ position: "relative", marginBottom: 6 }}>
          <input
            id="onboarding-name"
            name="displayName"
            autoComplete="nickname"
            ref={inputRef}
            value={name}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={t("onboarding.namePlaceholder")}
            style={{ width: "100%", padding: "13px 84px 13px 14px", borderRadius: 13, border: `1.5px solid ${trimmed && !valid ? "var(--ds-danger)" : "var(--ds-border-strong)"}`, background: "var(--ds-background)", color: "var(--ds-foreground)", fontSize: 16, fontWeight: 600, fontFamily: "var(--ds-font-sans)", outline: "none" }}
          />
          <button onClick={() => setName(randomName())} title={t("onboarding.surpriseMe")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, border: "1px solid var(--ds-border)", background: "var(--ds-surface-muted)", color: "var(--ds-foreground-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Icons.Dices size={14} />{t("onboarding.random")}
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", minHeight: 18, marginBottom: 20 }}>
          <span style={{ fontSize: 11.5, color: trimmed && !valid ? "var(--ds-danger)" : "var(--ds-foreground-muted)" }}>{trimmed && !valid ? t("onboarding.nameInvalid") : t("onboarding.nameHint")}</span>
          <span style={{ fontFamily: "var(--ds-font-mono)", fontSize: 11.5, color: "var(--ds-foreground-muted)" }}>{name.length}/16</span>
        </div>

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ds-foreground-muted)", marginBottom: 10 }}>{t("onboarding.identityColor")}</label>
        <div className="onboarding-colors" style={{ display: "flex", gap: 9, marginBottom: 26 }}>
          {COLOR_KEYS.map((k) => {
            const c = COLORS[k];
            const on = color === k;
            return (
              <button key={k} onClick={() => setColor(k)} title={k} style={{ flex: 1, height: 38, borderRadius: 11, cursor: "pointer", background: c.base, border: on ? "3px solid var(--ds-foreground)" : "3px solid transparent", boxShadow: on ? "var(--ds-shadow-sm)" : "none", display: "grid", placeItems: "center", transition: "transform 120ms", transform: on ? "translateY(-2px)" : "none" }}>
                <Sigil emblem="crest" color={k} size={22} />
                <span className="onboarding-color-label">{k}</span>
                {on ? <Icons.Check className="onboarding-color-check" size={14} style={{ color: c.on }} /> : null}
              </button>
            );
          })}
        </div>

        <Button size="lg" full icon={Icons.ArrowRight} disabled={!valid} onClick={submit}>{t("onboarding.enter")}</Button>
      </section>

      <div style={{ position: "absolute", bottom: 22, fontSize: 12, color: "var(--ds-foreground-muted)", fontFamily: "var(--ds-font-mono)" }}>v1.4.0</div>
    </main>
  );
}
