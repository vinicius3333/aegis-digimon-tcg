import { useEffect, useId, useRef, useState } from "react";
import type { Seat } from "@aegis/shared";
import { Icons } from "../design/icons";

export function ArenaDemoTools({
  portuguese,
  deckCounts,
  onKeywords,
  onHatch,
  onBreedingMove,
  onResult,
  onTrashSource,
  onHandSource,
  onDraw,
  onShuffle,
  onHandTransfer,
  onVisualPlayback,
  onSecurityBattle,
  onOpeningSecurityDeal,
  onTurnStart,
  onEffects,
  onNoticeBurst,
  onHandSelection,
  onMixedSelection,
  onImperial,
  onEffectActivation,
  onStackStrip,
  onDeckReturn,
  onHandReturn,
  onSecurityEffect,
  onResolvedSecurityEffect,
  onPlainSecurityCheck,
  onDockedSecurityBattle,
  onNoticeOrdering,
  onSplitToasts,
  onPlutomon,
  onSecurityFlip,
  securityFaceUpCount,
  onSuspendTamer,
  onReadyTamers,
  onToggleDeepStack,
  disabled = false,
}: {
  portuguese: boolean;
  deckCounts: readonly [number, number];
  onKeywords: () => void;
  /** Accepted hatch events on the two empty breeding slots in the hatch fixture. */
  onHatch?: (seat: Seat) => void;
  onBreedingMove?: (seat: Seat) => void;
  onResult?: (outcome: "win" | "loss" | "draw") => void;
  /** Activate a buried trash card without changing the pile's order. */
  onTrashSource?: (seat: Seat) => void;
  onHandSource?: (position: "first" | "last") => void;
  onDraw: (seat: Seat) => void;
  onShuffle?: (seat: Seat, deck: "deck" | "eggDeck") => void;
  onHandTransfer?: (seat: Seat, revealed: boolean) => void;
  onHandReturn?: (seat: Seat, count: 1 | 2) => void;
  onVisualPlayback: () => void;
  onSecurityBattle?: (outcome: "attackerWins" | "attackerLoses") => void;
  onOpeningSecurityDeal?: () => void;
  onTurnStart: () => void;
  onEffects?: () => void;
  /** Four notices in a row, one batch each, for watching the queued slots fill. */
  onNoticeBurst?: () => void;
  /** Opens a selection over the viewer's own hand, as an effect asking which cards to trash. */
  onHandSelection?: () => void;
  onMixedSelection?: () => void;
  onImperial?: () => void;
  onEffectActivation?: (
    timing: "On Play" | "When Digivolving" | "When Attacking" | "Start of Main Phase" | "On Deletion",
  ) => void;
  onDeckReturn?: (seat: Seat) => void;
  onStackStrip?: (seat: Seat, kind: "sources" | "top") => void;
  /** The docked security card and a full narration column at once. */
  onSecurityEffect?: () => void;
  /** A reveal, its play and its close delivered together through the same cue pipeline. */
  onResolvedSecurityEffect?: () => void;
  /** A checked card with no activated effect or battle, on either player's side. */
  onPlainSecurityCheck?: (seat: Seat) => void;
  /** A revealed Digimon returns from its execution slot for a security battle. */
  onDockedSecurityBattle?: () => void;
  /** Attack, its [When Attacking] trigger, the check, then the turn change — in order. */
  onNoticeOrdering?: () => void;
  /** One moment in both columns: the clause on the left, the cards it turned up on the right. */
  onSplitToasts?: () => void;
  /** The opponent's [All Turns] clause deleting the viewer's Digimon, with nothing asked of them. */
  onPlutomon?: () => void;
  onSecurityFlip?: () => void;
  securityFaceUpCount?: number;
  /** Crowded field: turn the next Ami Aiba, so a copy leaves its group. */
  onSuspendTamer?: () => void;
  /** Crowded field: ready every Tamer, so turned copies rejoin their groups. */
  onReadyTamers?: () => void;
  /** Rotate the twelve-source, two-link fixture while its neighbours regroup. */
  onToggleDeepStack?: () => void;
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
          {onHatch
            ? ([0, 1] as const).map((seat) => (
                <button
                  key={`hatch-${seat}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onHatch(seat);
                  }}
                >
                  {portuguese
                    ? `Reproduzir nascimento: ${seat === 0 ? "seu ovo" : "ovo do oponente"}`
                    : `Preview hatch: ${seat === 0 ? "your egg" : "opponent egg"}`}
                </button>
              ))
            : null}
          {onTrashSource
            ? ([0, 1] as const).map((seat) => (
                <button
                  key={`trash-source-${seat}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onTrashSource(seat);
                  }}
                >
                  {portuguese
                    ? `Ativar carta sob o lixo: ${seat === 0 ? "sua carta" : "carta do oponente"}`
                    : `Preview trash source: ${seat === 0 ? "your buried card" : "opponent buried card"}`}
                </button>
              ))
            : null}
          {onHandSource
            ? (["first", "last"] as const).map((position) => (
                <button
                  key={`hand-source-${position}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onHandSource(position);
                  }}
                >
                  {portuguese
                    ? `Ativar efeito na mão: ${position === "first" ? "primeira carta" : "última carta"}`
                    : `Preview hand source: ${position} card`}
                </button>
              ))
            : null}
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
          {onDeckReturn
            ? ([0, 1] as const).map((seat) => (
                <button
                  key={`return-${seat}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onDeckReturn(seat);
                  }}
                >
                  {portuguese ? "Retornar Digimon ao deck" : "Return Digimon to deck"}:{" "}
                  {seat === 0 ? (portuguese ? "seu campo" : "your") : portuguese ? "oponente" : "opponent"}
                </button>
              ))
            : null}
          {onHandReturn
            ? ([0, 1] as const).flatMap((seat) =>
                ([1, 2] as const).map((count) => (
                  <button
                    key={`hand-return-${seat}-${count}`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onHandReturn(seat, count);
                    }}
                  >
                    {portuguese ? `Retornar ${count} Digimon à mão` : `Return ${count} Digimon to hand`}:{" "}
                    {seat === 0 ? (portuguese ? "seu campo" : "your") : portuguese ? "oponente" : "opponent"}
                  </button>
                )),
              )
            : null}
          {onStackStrip
            ? ([0, 1] as const).flatMap((seat) =>
                (["sources", "top"] as const).map((kind) => (
                  <button
                    key={`strip-${seat}-${kind}`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onStackStrip(seat, kind);
                    }}
                  >
                    {portuguese ? "Remover" : "Remove"}{" "}
                    {kind === "sources"
                      ? portuguese
                        ? "2 fontes"
                        : "2 sources"
                      : portuguese
                        ? "carta do topo"
                        : "stack top"}
                    : {seat === 0 ? (portuguese ? "seu campo" : "your") : portuguese ? "oponente" : "opponent"}
                  </button>
                )),
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
          {onResolvedSecurityEffect ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onResolvedSecurityEffect();
              }}
            >
              {portuguese ? "Reproduzir segurança já resolvida" : "Play resolved security-effect scenario"}
            </button>
          ) : null}
          {onDockedSecurityBattle ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onDockedSecurityBattle();
              }}
            >
              {portuguese ? "Batalha após efeito de segurança" : "Security battle after effect"}
            </button>
          ) : null}
          {onPlainSecurityCheck
            ? ([0, 1] as const).map((seat) => (
                <button
                  key={`plain-security-${seat}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onPlainSecurityCheck(seat);
                  }}
                >
                  {portuguese
                    ? `Segurança sem efeito: ${seat === 0 ? "sua carta" : "carta do oponente"}`
                    : `Security without effect: ${seat === 0 ? "your card" : "opponent card"}`}
                </button>
              ))
            : null}
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
          {onMixedSelection ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onMixedSelection();
              }}
            >
              {portuguese ? "Selecionar cartas da mão e do lixo" : "Select cards from hand and trash"}
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
          {onSuspendTamer ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onSuspendTamer();
              }}
            >
              {portuguese ? "Suspender uma Ami Aiba" : "Suspend one Ami Aiba"}
            </button>
          ) : null}
          {onToggleDeepStack ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onToggleDeepStack();
              }}
            >
              {portuguese ? "Alternar suspensão da pilha profunda" : "Toggle deep stack suspension"}
            </button>
          ) : null}
          {onReadyTamers ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onReadyTamers();
              }}
            >
              {portuguese ? "Desvirar seus Tamers" : "Unsuspend your Tamers"}
            </button>
          ) : null}
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
          {onHandTransfer
            ? ([0, 1] as const).flatMap((seat) =>
                [false, true].map((revealed) => (
                  <button
                    type="button"
                    role="menuitem"
                    key={`transfer-${seat}-${revealed}`}
                    disabled={deckCounts[seat] === 0}
                    onClick={() => {
                      close();
                      onHandTransfer(seat, revealed);
                    }}
                  >
                    {portuguese
                      ? `${revealed ? "Adicionar carta revelada" : "Buscar carta"} ${seat === 0 ? "à sua mão" : "à mão do oponente"}`
                      : `${revealed ? "Add revealed card" : "Search card"} ${seat === 0 ? "to your hand" : "to opponent hand"}`}
                  </button>
                )),
              )
            : null}
          {onResult
            ? (["win", "loss", "draw"] as const).map((outcome) => (
                <button
                  key={`result-${outcome}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onResult(outcome);
                  }}
                >
                  {portuguese
                    ? `Mostrar ${outcome === "win" ? "vitória" : outcome === "loss" ? "derrota" : "empate"}`
                    : `Preview result: ${outcome}`}
                </button>
              ))
            : null}
          {onBreedingMove
            ? ([0, 1] as const).map((seat) => (
                <button
                  key={`breeding-move-${seat}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onBreedingMove(seat);
                  }}
                >
                  {portuguese
                    ? `Mover ${seat === 0 ? "sua carta" : "carta do oponente"} da criação ao campo`
                    : `Move ${seat === 0 ? "your" : "opponent"} breeding card to battle`}
                </button>
              ))
            : null}
          {onShuffle
            ? ([0, 1] as const).flatMap((seat) =>
                (["deck", "eggDeck"] as const).map((deck) => (
                  <button
                    key={`shuffle-${seat}-${deck}`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onShuffle(seat, deck);
                    }}
                  >
                    {portuguese
                      ? `Embaralhar ${seat === 0 ? "seu " : ""}${deck === "deck" ? "deck" : "deck de ovos"}${seat === 1 ? " do oponente" : ""}`
                      : `Preview shuffle: ${seat === 0 ? "your" : "opponent"} ${deck === "deck" ? "deck" : "egg deck"}`}
                  </button>
                )),
              )
            : null}
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
