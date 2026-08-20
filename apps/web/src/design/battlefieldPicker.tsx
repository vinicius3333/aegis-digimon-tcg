/* Battlefield chooser shared by the desktop and mobile settings screens. Each
   tile previews the option exactly as the board paints it — scrim included — so
   what the player picks is what the match shows. The last tile takes an image
   from the player; it never leaves the browser. */

import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  BATTLEFIELDS,
  CLASSIC_BATTLEFIELD,
  CUSTOM_BATTLEFIELD_ID,
  battlefieldStyle,
  clearCustomBattlefield,
  getBattlefieldId,
  getCustomBattlefieldSrc,
  setBattlefieldId,
  setCustomBattlefield,
  subscribeBattlefield,
} from "./battlefield";
import { Icons } from "./icons";
import { useTranslation } from "../i18n";
import { playSound } from "./sound";

const MAX_EDGE = 1920;

/** Scales the picked file down before it goes into localStorage as a data URL. */
async function toStorableDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.82);
}

const tileStyle = (selected: boolean): CSSProperties => ({
  padding: 0,
  border: `2px solid ${selected ? "var(--ds-primary)" : "var(--ds-border)"}`,
  borderRadius: 12,
  overflow: "hidden",
  cursor: "pointer",
  background: "var(--ds-surface)",
  textAlign: "left",
  boxShadow: selected ? "var(--ds-shadow-md)" : "none",
});

export function BattlefieldPicker() {
  const { t } = useTranslation();
  const selectedId = useSyncExternalStore(subscribeBattlefield, getBattlefieldId, () => CLASSIC_BATTLEFIELD.id);
  const customSrc = useSyncExternalStore(subscribeBattlefield, getCustomBattlefieldSrc, () => undefined);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string>();

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    if (!file.type.startsWith("image/")) {
      setError(t("settings.playmatInvalid"));
      return;
    }
    try {
      setCustomBattlefield(await toStorableDataUrl(file));
      playSound("select");
    } catch {
      setError(t("settings.playmatTooLarge"));
    }
  }

  const customSelected = selectedId === CUSTOM_BATTLEFIELD_ID;
  return (
    <>
      <div className="settings-tile-grid">
        {BATTLEFIELDS.map((field) => {
          const selected = field.id === selectedId;
          return (
            <button
              key={field.id}
              type="button"
              aria-pressed={selected}
              onClick={() => { setBattlefieldId(field.id); playSound("select"); }}
              style={tileStyle(selected)}
            >
              <span style={{ display: "block", height: 68, ...battlefieldStyle(field.id) }} />
              <span style={{ display: "block", padding: "8px 10px 10px", fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 14, color: selected ? "var(--ds-primary)" : "var(--ds-foreground)" }}>
                {field.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={customSelected}
          onClick={() => {
            if (customSrc && !customSelected) { setBattlefieldId(CUSTOM_BATTLEFIELD_ID); playSound("select"); return; }
            fileRef.current?.click();
          }}
          style={tileStyle(customSelected)}
        >
          {customSrc ? (
            <span style={{ display: "block", height: 68, ...battlefieldStyle(CUSTOM_BATTLEFIELD_ID) }} />
          ) : (
            <span style={{ display: "grid", height: 68, placeItems: "center", color: "var(--ds-foreground-muted)", background: "var(--ds-surface-muted)" }}>
              <Icons.Upload size={20} />
            </span>
          )}
          <span style={{ display: "block", padding: "8px 10px 10px", fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 14, color: customSelected ? "var(--ds-primary)" : "var(--ds-foreground)" }}>
            {customSrc ? t("settings.playmatCustom") : t("settings.playmatUpload")}
          </span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {customSrc ? (
        <button type="button" className="settings-playmat-clear" onClick={() => clearCustomBattlefield()}>
          <Icons.Ban size={14} />{t("settings.playmatRemove")}
        </button>
      ) : null}

      {error ? <p className="settings-playmat-error" role="status">{error}</p> : null}
    </>
  );
}
