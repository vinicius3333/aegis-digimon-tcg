/* The color spread of a main deck, as a bar per color. */

import { getCardDefinition } from "@aegis/shared";
import { ColorDot } from "../design/primitives";
import { COLORS, colorKey, type ColorName } from "../design/theme";
import { useTranslation } from "../i18n";
import { CountMap } from "./deckCounts";
import "./deckBuilder.css";

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
      <div className="deck-stat-label">{t("deck.colorBalance")}</div>
      <div className="deck-color-balance__bar">
        {entries.map(([color, n]) => (
          <div key={color} style={{ width: `${(n / tot) * 100}%`, background: COLORS[color].base }} />
        ))}
      </div>
      <div className="deck-color-balance__legend">
        {entries.map(([color, n]) => (
          <span key={color}>
            <ColorDot color={color} size={9} />
            {color} {n}
          </span>
        ))}
        {entries.length === 0 ? <span className="deck-color-balance__empty">—</span> : null}
      </div>
    </div>
  );
}
