import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const tooltipId = useId();
  const [open, setOpen] = useState<{ id: string; left: number; top: number; above: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }
  function closeSoon() {
    if (document.activeElement === trigger.current) return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  }
  function show(id: string, button: HTMLButtonElement) {
    cancelClose();
    trigger.current = button;
    const rect = button.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 16);
    const above = window.innerHeight - rect.bottom < 80 || side === "you";
    setOpen({
      id,
      left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)),
      top: above ? rect.top - 8 : rect.bottom + 8,
      above,
    });
  }
  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.type === "keydown" && (event as KeyboardEvent).key !== "Escape") return;
      if (event.type === "pointerdown" && trigger.current?.contains(event.target as Node)) return;
      setOpen(null);
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);
  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    [],
  );
  const counters = [
    {
      id: "eggs",
      count: eggs,
      label: `${t("game.pile.eggs")} · ${eggs}`,
      tooltip: t("game.counter.eggs", { count: eggs }),
      path: "M12 2.5c-3.2 0-7 7.4-7 12a7 7 0 0 0 14 0c0-4.6-3.8-12-7-12Z M8.5 14l3.5-2.5 3.5 2.5-3.5 4Z",
    },
    {
      id: "hand",
      count: hand,
      label: t("game.handCount", { count: hand }),
      tooltip: t("game.counter.hand", { count: hand }),
      path: "m3 7 4-1 4 14-4 1Z M9 3h6v16H9 M17 6l4 1-4 14-3-1 M11 7h2",
    },
    {
      id: "deck",
      count: deck,
      label: `${t("game.pile.deck")} · ${deck}`,
      tooltip: t("game.counter.deck", { count: deck }),
      path: "M7 3h12v15H7Z M4 6v15h12 M10 7h6 M10 10h6 M10 13h3",
    },
    {
      id: "trash",
      count: trash,
      label: `${t("game.pile.trash")} · ${trash}`,
      tooltip: t("game.counter.trash", { count: trash }),
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
      {counters.map(({ id, count, label, tooltip, path }) => (
        <button
          key={id}
          type="button"
          className="game-arena-counter"
          data-counter={id}
          aria-label={tooltip}
          aria-describedby={open?.id === id ? tooltipId : undefined}
          onMouseEnter={(event) => show(id, event.currentTarget)}
          onMouseLeave={closeSoon}
          onFocus={(event) => show(id, event.currentTarget)}
          onBlur={closeSoon}
          onClick={(event) => show(id, event.currentTarget)}
        >
          <span className="game-arena-counter__icon" role="img" aria-label={label}>
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
        </button>
      ))}
      {open &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="game-arena-counter-tooltip"
            data-above={open.above}
            style={{ left: open.left, top: open.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={closeSoon}
          >
            {counters.find((counter) => counter.id === open.id)?.tooltip}
          </span>,
          document.body,
        )}
    </div>
  );
}
