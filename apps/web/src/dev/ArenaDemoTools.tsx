import { useEffect, useId, useRef, useState } from "react";
import type { Seat } from "@aegis/shared";
import { Icons } from "../design/icons";

export function ArenaDemoTools({
  portuguese,
  deckCounts,
  onKeywords,
  onDraw,
  onTurnStart,
  disabled = false,
}: {
  portuguese: boolean;
  deckCounts: readonly [number, number];
  onKeywords: () => void;
  onDraw: (seat: Seat) => void;
  onTurnStart: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  const label = portuguese ? "Ferramentas da demo" : "Demo tools";
  return (
    <div className="aegis-arena-demo-tools" ref={root}>
      <button
        ref={trigger}
        className="aegis-arena-demo-keywords"
        type="button"
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Icons.Sparkles size={17} aria-hidden="true" />
        <span>{portuguese ? "Testar" : "Tools"}</span>
      </button>
      {open ? (
        <div
          ref={menu}
          id={id}
          className="aegis-arena-demo-tools-menu"
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
              return;
            }
            if (event.key === "Tab") {
              setOpen(false);
              return;
            }
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const buttons = Array.from(
              menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
            );
            const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : (current + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
            buttons[next]?.focus();
          }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={deckCounts[0] === 0}
            onClick={() => {
              close();
              onTurnStart();
            }}
          >
            {portuguese ? "Reproduzir início do turno" : "Preview turn start"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onKeywords();
            }}
          >
            {portuguese ? "Editar keywords da demo" : "Edit demo keywords"}
          </button>
          {([0, 1] as const).map((seat) => {
            const action = portuguese
              ? seat === 0
                ? "Comprar sua carta"
                : "Comprar carta do oponente"
              : seat === 0
                ? "Draw your card"
                : "Draw opponent card";
            return (
              <button
                key={seat}
                type="button"
                role="menuitem"
                aria-label={action}
                disabled={deckCounts[seat] === 0}
                onClick={() => onDraw(seat)}
              >
                <span>{action}</span>
                <small>
                  {deckCounts[seat]} {portuguese ? "no deck" : "in deck"}
                </small>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
