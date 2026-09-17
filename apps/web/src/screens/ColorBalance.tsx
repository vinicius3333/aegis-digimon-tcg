/* The color spread of a main deck, as a bar per color. */

import { getCardDefinition } from "@aegis/shared";
import { ColorDot } from "../design/primitives";
import { COLORS, colorKey, type ColorName } from "../design/theme";
import { useTranslation } from "../i18n";
import { CountMap } from "./deckCounts";

export function ColorBalance({ main }: { main: CountMap }) {
  const { t } = useTranslation();
  const tally = new Map<ColorName, number>();
  for (const [id, n] of Object.entries(main)) {
    const def = getCardDefinition(id);
    if (!def) continue;
    for (const col of def.colors) {
      const key = colorKey(col);
      tally.set(key, (tally.get(key) ?? 0) + n);
    }
  }
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const tot = entries.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div>
      <div style={statLabel}>{t("deck.colorBalance")}</div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          overflow: "hidden",
          display: "flex",
          background: "var(--ds-surface-muted)",
        }}
      >
        {entries.map(([color, n]) => (
          <div key={color} style={{ width: `${(n / tot) * 100}%`, background: COLORS[color].base }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {entries.map(([color, n]) => (
          <span
            key={color}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              color: "var(--ds-foreground-muted)",
            }}
          >
            <ColorDot color={color} size={9} />
            {color} {n}
          </span>
        ))}
        {entries.length === 0 ? (
          <span style={{ fontSize: 11.5, color: "var(--ds-foreground-disabled)", fontStyle: "italic" }}>—</span>
        ) : null}
      </div>
    </div>
  );
}

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ds-foreground-muted)",
  marginBottom: 12,
};
