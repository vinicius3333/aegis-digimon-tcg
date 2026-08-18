/* Battlefield chooser shared by the desktop and mobile settings screens. Each
   tile previews the option exactly as the board paints it — scrim included — so
   what the player picks is what the match shows. */

import { useSyncExternalStore } from "react";
import {
  BATTLEFIELDS,
  CLASSIC_BATTLEFIELD,
  battlefieldStyle,
  getBattlefieldId,
  setBattlefieldId,
  subscribeBattlefield,
} from "./battlefield";
import { playSound } from "./sound";

export function BattlefieldPicker({ columns = 3 }: { columns?: number }) {
  const selectedId = useSyncExternalStore(subscribeBattlefield, getBattlefieldId, () => CLASSIC_BATTLEFIELD.id);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12 }}>
      {BATTLEFIELDS.map((field) => {
        const selected = field.id === selectedId;
        return (
          <button
            key={field.id}
            type="button"
            aria-pressed={selected}
            onClick={() => { setBattlefieldId(field.id); playSound("select"); }}
            style={{
              padding: 0,
              border: `2px solid ${selected ? "var(--ds-primary)" : "var(--ds-border)"}`,
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              background: "var(--ds-surface)",
              textAlign: "left",
              boxShadow: selected ? "var(--ds-shadow-md)" : "none",
            }}
          >
            <span style={{ display: "block", height: 68, ...battlefieldStyle(field.id) }} />
            <span style={{ display: "block", padding: "8px 10px 10px" }}>
              <span style={{ display: "block", fontFamily: "var(--ds-font-display)", fontWeight: 700, fontSize: 14, color: selected ? "var(--ds-primary)" : "var(--ds-foreground)" }}>
                {field.label}
              </span>
              <span style={{ display: "block", fontSize: 12, lineHeight: 1.35, color: "var(--ds-foreground-muted)", marginTop: 2 }}>
                {field.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
