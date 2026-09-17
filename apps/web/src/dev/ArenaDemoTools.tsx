import { useEffect, useId, useRef, useState } from "react";
import type { Seat } from "@aegis/shared";
import { Icons } from "../design/icons";

export function ArenaDemoTools({
  portuguese,
  deckCounts,
  onKeywords,
  onDraw,
  onVisualPlayback,
  onSecurityBattle,
  onOpeningSecurityDeal,
  onTurnStart,
  onEffects,
  onNoticeBurst,
  onHandSelection,
  onImperial,
  onEffectActivation,
  onSecurityEffect,
  onNoticeOrdering,
  onSplitToasts,
  onPlutomon,
  onSecurityFlip,
  securityFaceUpCount,
  disabled = false,
}: {
  portuguese: boolean;
  deckCounts: readonly [number, number];
  onKeywords: () => void;
  onDraw: (seat: Seat) => void;
  onVisualPlayback: () => void;
  onSecurityBattle?: (outcome: "attackerWins" | "attackerLoses") => void;
  onOpeningSecurityDeal?: () => void;
  onTurnStart: () => void;
  onEffects?: () => void;
  /** Four notices in a row, one batch each, for watching the queued slots fill. */
  onNoticeBurst?: () => void;
  /** Opens a selection over the viewer's own hand, as an effect asking which cards to trash. */
  onHandSelection?: () => void;
  onImperial?: () => void;
  onEffectActivation?: (
    timing: "On Play" | "When Digivolving" | "When Attacking" | "Start of Main Phase" | "On Deletion",
  ) => void;
  /** The docked security card and a full narration column at once. */
  onSecurityEffect?: () => void;
  /** Attack, its [When Attacking] trigger, the check, then the turn change — in order. */
  onNoticeOrdering?: () => void;
  /** One moment in both columns: the clause on the left, the cards it turned up on the right. */
  onSplitToasts?: () => void;
  /** The opponent's [All Turns] clause deleting the viewer's Digimon, with nothing asked of them. */
  onPlutomon?: () => void;
  onSecurityFlip?: () => void;
  securityFaceUpCount?: number;
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
          {onSecurityBattle
            ? (["attackerWins", "attackerLoses"] as const).map((outcome) => (
                <button
                  key={outcome}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onSecurityBattle(outcome);
                  }}
                >
                  {outcome === "attackerWins"
                    ? portuguese
                      ? "Batalha de segurança: seu Digimon vence"
                      : "Security battle: your Digimon wins"
                    : portuguese
                      ? "Batalha de segurança: seu Digimon perde"
                      : "Security battle: your Digimon loses"}
                </button>
              ))
            : null}
          {onOpeningSecurityDeal ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onOpeningSecurityDeal();
              }}
            >
              {portuguese ? "Reproduzir segurança inicial (5 cartas)" : "Preview opening security deal (5 cards)"}
            </button>
          ) : null}
          {onEffectActivation
            ? (["On Play", "When Digivolving", "When Attacking", "Start of Main Phase", "On Deletion"] as const).map(
                (timing) => (
                  <button
                    key={timing}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onEffectActivation(timing);
                    }}
                  >
                    {portuguese ? "Reproduzir ativação" : "Preview activation"}: {timing}
                  </button>
                ),
              )
            : null}
          {onSecurityEffect ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onSecurityEffect();
              }}
            >
              {portuguese ? "Reproduzir efeito de segurança" : "Play security-effect scenario"}
            </button>
          ) : null}
          {onNoticeOrdering ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onNoticeOrdering();
              }}
            >
              {portuguese
                ? "Reproduzir ordem dos avisos: ataque → segurança → virada de turno"
                : "Play notice ordering: attack → security → turn change"}
            </button>
          ) : null}
          {onSplitToasts ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onSplitToasts();
              }}
            >
              {portuguese ? "Reproduzir avisos da esquerda e da direita" : "Play the left and right toasts"}
            </button>
          ) : null}
          {onPlutomon ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onPlutomon();
              }}
            >
              {portuguese
                ? "Reproduzir Plutomon: All Turns exclui seus Digimon"
                : "Play Plutomon: All Turns deletes your Digimon"}
            </button>
          ) : null}
          {onImperial ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onImperial();
              }}
            >
              {portuguese ? "Reproduzir Imperial: All Turns (2 partes)" : "Preview Imperial: All Turns (2 parts)"}
            </button>
          ) : null}
          {onEffects ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onEffects();
              }}
            >
              {portuguese ? "Reproduzir efeitos simultâneos" : "Preview simultaneous effects"}
            </button>
          ) : null}
          {onHandSelection ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onHandSelection();
              }}
            >
              {portuguese ? "Selecionar cartas da mão" : "Select cards from hand"}
            </button>
          ) : null}
          {onNoticeBurst ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onNoticeBurst();
              }}
            >
              {portuguese ? "Reproduzir 4 avisos seguidos" : "Preview 4 notices in a row"}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onVisualPlayback();
            }}
          >
            {portuguese ? "Reproduzir keywords automaticamente" : "Automatically preview keywords"}
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
          {onSecurityFlip ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onSecurityFlip();
              }}
            >
              {securityFaceUpCount === 0
                ? portuguese
                  ? "Restaurar segurança revelada"
                  : "Restore face-up security"
                : portuguese
                  ? "Virar carta da segurança para baixo"
                  : "Turn a security card face-down"}
            </button>
          ) : null}
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
