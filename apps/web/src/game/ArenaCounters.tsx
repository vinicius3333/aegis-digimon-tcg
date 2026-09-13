import { useTranslation } from "../i18n";
import "./arenaControls.css";

export function ArenaCounters({
  side,
  eggs,
  hand,
  deck,
  trash,
}: {
  side: "you" | "opp";
  eggs: number;
  hand: number;
  deck: number;
  trash: number;
}) {
  const { t } = useTranslation();
  const counters = [
    {
      id: "eggs",
      count: eggs,
      label: `${t("game.pile.eggs")} · ${eggs}`,
      path: "M12 2.5c-3.2 0-7 7.4-7 12a7 7 0 0 0 14 0c0-4.6-3.8-12-7-12Z M8.5 14l3.5-2.5 3.5 2.5-3.5 4Z",
    },
    {
      id: "hand",
      count: hand,
      label: t("game.handCount", { count: hand }),
      path: "m3 7 4-1 4 14-4 1Z M9 3h6v16H9 M17 6l4 1-4 14-3-1 M11 7h2",
    },
    {
      id: "deck",
      count: deck,
      label: `${t("game.pile.deck")} · ${deck}`,
      path: "M7 3h12v15H7Z M4 6v15h12 M10 7h6 M10 10h6 M10 13h3",
    },
    {
      id: "trash",
      count: trash,
      label: `${t("game.pile.trash")} · ${trash}`,
      path: "M6 3h12v14H6Z M9 6h6 M9 9h4 M3 17h6l2 3h2l2-3h6v5H3Z",
    },
  ];
  return (
    <div
      className="game-arena-counters"
      data-side={side}
      role="group"
      aria-label={t(side === "you" ? "game.you" : "game.opponent")}
    >
      {counters.map(({ id, count, label, path }) => (
        <span key={id} className="game-arena-counter" data-counter={id} role="img" aria-label={label} title={label}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={path} />
          </svg>
          <strong aria-hidden="true">{count}</strong>
        </span>
      ))}
    </div>
  );
}
