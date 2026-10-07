import { useEffect, useState } from "react";
import {
  MANUAL_ZONES,
  getCardDefinition,
  tokenDefinitions,
  isTokenDefinition,
  type ManualAction,
  type ManualCard,
  type ManualSnapshot,
  type ManualStack,
  type ManualZone,
  type Seat,
} from "@aegis/shared";
import { CardMini } from "../design/cards";
import { Button, Dialog } from "../design/primitives";
import { Panel } from "../design/surfaces";
import { useTranslation, type Translate, type TranslationKey } from "../i18n";
import { roomInviteUrl } from "../roomInvite";
import "./manual.css";

type Selection = { card: string; stack?: string };
const cardName = (card: ManualCard) => getCardDefinition(card.cardId)?.nameEn ?? "?";
const zoneLabel = (t: Translate, zone: ManualZone) => t(`manual.zone.${zone}`);

function CardButton({ card, selected, onSelect }: { card: ManualCard; selected?: boolean; onSelect?: () => void }) {
  const face = (
    <CardMini cardId={card.cardId} artId={card.artId} faceDown={!card.cardId} width={76} selected={selected} />
  );
  if (!onSelect || !card.id) return <span className="manual-card">{face}</span>;
  return (
    <button
      type="button"
      className="manual-card"
      aria-label={cardName(card)}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {face}
    </button>
  );
}
function StackView({
  stack,
  selection,
  onSelect,
  t,
}: {
  stack: ManualStack;
  selection?: Selection;
  onSelect?: (selection: Selection) => void;
  t: Translate;
}) {
  return (
    <article className={`manual-stack ${stack.suspended ? "is-suspended" : ""}`} aria-label={cardName(stack.cards[0]!)}>
      <div className="manual-stack__top">
        <CardButton
          card={stack.cards[0]!}
          selected={selection?.card === stack.cards[0]?.id}
          onSelect={onSelect ? () => onSelect({ card: stack.cards[0]!.id, stack: stack.id }) : undefined}
        />
      </div>
      <div className="manual-stack__meta">
        <code>#{stack.id.slice(0, 4)}</code>
        {stack.suspended ? t("manual.suspend") : ""}
        {stack.dp ? ` ${stack.dp > 0 ? "+" : ""}${stack.dp} DP` : ""}
        {stack.note ? ` · ${stack.note}` : ""}
      </div>
      {stack.cards.length > 1 ? (
        <details>
          <summary>
            {t("manual.sources")} ({stack.cards.length - 1})
          </summary>
          <div className="manual-source-cards">
            {stack.cards.slice(1).map((card) => (
              <CardButton
                key={card.id}
                card={card}
                selected={selection?.card === card.id}
                onSelect={onSelect ? () => onSelect({ card: card.id, stack: stack.id }) : undefined}
              />
            ))}
          </div>
        </details>
      ) : null}
      {stack.links.length ? (
        <details>
          <summary>
            {t("manual.links")} ({stack.links.length})
          </summary>
          <div className="manual-source-cards">
            {stack.links.map((card) => (
              <CardButton
                key={card.id}
                card={card}
                selected={selection?.card === card.id}
                onSelect={onSelect ? () => onSelect({ card: card.id, stack: stack.id }) : undefined}
              />
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

export function ManualBoard({
  snapshot,
  send,
  pending = false,
  status = "connected",
  error,
  onExit,
}: {
  snapshot: ManualSnapshot;
  send: (action: ManualAction) => void;
  pending?: boolean;
  status?: string;
  error?: string;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<Selection>();
  const [to, setTo] = useState<ManualZone>("battle");
  const [target, setTarget] = useState("");
  const [placement, setPlacement] = useState<"top" | "bottom" | "link">("top");
  const [from, setFrom] = useState<"deck" | "eggDeck" | "security" | "trash" | "reveal" | "hand">("deck");
  const [pileTo, setPileTo] = useState<ManualZone>("reveal");
  const [count, setCount] = useState(1);
  const [bottom, setBottom] = useState(false);
  const [search, setSearch] = useState<"deck" | "security" | "eggDeck">("deck");
  const [dp, setDp] = useState(0);
  const [note, setNote] = useState("");
  const [attackTarget, setAttackTarget] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [concede, setConcede] = useState(false);
  const [draftMemory, setDraftMemory] = useState(snapshot.memory);
  useEffect(() => setDraftMemory(snapshot.memory), [snapshot.memory]);
  const [tokenId, setTokenId] = useState(tokenDefinitions[0]!.cardId);
  const own = snapshot.players[snapshot.seat]!;
  const opponentSeat = (1 - snapshot.seat) as Seat;
  const opponent = snapshot.players[opponentSeat];
  const stacks = [...own.battle, ...own.breeding];
  const selectedStack = stacks.find((stack) => stack.id === selection?.stack);
  const visibleOwnCards = [
    ...own.hand,
    ...own.trash,
    ...own.reveal,
    ...own.security,
    ...stacks.flatMap((stack) => [...stack.cards, ...stack.links]),
    ...(snapshot.inspection?.cards ?? []),
  ];
  const selectedCard = visibleOwnCards.find((card) => card.id === selection?.card && card.id);
  const blocked = pending || status !== "connected";
  const playable = snapshot.phase === "playing" && !blocked;
  useEffect(() => {
    setDp(selectedStack?.dp ?? 0);
    setNote(selectedStack?.note ?? "");
  }, [selectedStack?.id, selectedStack?.dp, selectedStack?.note]);
  useEffect(() => {
    setTarget("");
    if (to !== "battle" && to !== "breeding") setPlacement("top");
  }, [to, selectedStack?.id]);
  function move(whole: boolean) {
    if (!selectedCard) return;
    if (whole && selectedStack && placement !== "link")
      send({ type: "moveStack", stack: selectedStack.id, to, target: target || undefined, placement });
    else send({ type: "move", card: selectedCard.id, to, target: target || undefined, placement });
    setSelection(undefined);
  }
  function take(source: "deck" | "security" | "eggDeck", destination: ManualZone, amount = 1) {
    send({ type: "take", from: source, to: destination, count: amount });
  }
  const zoneOptions = MANUAL_ZONES.map((z) => (
    <option key={z} value={z}>
      {zoneLabel(t, z)}
    </option>
  ));
  const selectedInPile =
    (snapshot.inspection?.zone === "deck" || snapshot.inspection?.zone === "eggDeck") &&
    snapshot.inspection.cards.some((card) => card.id === selectedCard?.id);
  return (
    <main className="manual-table" aria-label={t("manual.title")}>
      <header className="manual-header">
        <div>
          <h1>{t("manual.title")}</h1>
          <p>{t("manual.description")}</p>
        </div>
        {snapshot.roomCode ? (
          <div className="manual-invite">
            <code>{snapshot.roomCode}</code>
            <input aria-label={t("manual.copy")} readOnly value={roomInviteUrl(snapshot.roomCode, undefined, true)} />
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(roomInviteUrl(snapshot.roomCode, undefined, true))
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false));
              }}
            >
              {t(copied ? "manual.copied" : "manual.copy")}
            </Button>
          </div>
        ) : null}
        <Button variant="secondary" onClick={onExit}>
          {t("manual.leave")}
        </Button>
      </header>
      {error ? (
        <p role="alert" className="manual-error">
          {error}
        </p>
      ) : null}
      {status !== "connected" ? (
        <p role="status">{t(status === "reconnecting" ? "manual.reconnecting" : "manual.closed")}</p>
      ) : null}
      {snapshot.phase === "over" ? (
        <Panel as="section" className="manual-result">
          <h2>{t(snapshot.winner === snapshot.seat ? "manual.won" : "manual.lost")}</h2>
        </Panel>
      ) : null}
      {snapshot.phase === "setup" ? (
        <Panel as="section" className="manual-setup">
          <p>{opponent ? t("manual.setup") : t("manual.waiting")}</p>
          <label>
            {t("manual.first")}
            <select
              value={snapshot.turn}
              disabled={blocked || snapshot.players.some((p) => p.ready)}
              onChange={(e) => send({ type: "first", seat: Number(e.target.value) as Seat })}
            >
              {snapshot.players.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={blocked || own.ready || own.mulligan}
            variant="secondary"
            onClick={() => send({ type: "mulligan" })}
          >
            {t("manual.mulligan")}
          </Button>
          <Button disabled={blocked || own.ready || !opponent} onClick={() => send({ type: "ready" })}>
            {t("manual.ready")}
            {own.ready ? " ✓" : ""}
          </Button>
        </Panel>
      ) : null}
      <Panel as="section" className="manual-memory">
        <label>
          {t("manual.memory", { name: snapshot.players[0]!.name })}
          <input
            type="range"
            min={-10}
            max={10}
            value={draftMemory}
            disabled={!playable}
            onChange={(e) => setDraftMemory(Number(e.target.value))}
          />
        </label>
        <output aria-label={t("manual.memory", { name: snapshot.players[0]!.name })}>{draftMemory}</output>
        <Button
          variant="secondary"
          disabled={!playable || draftMemory === snapshot.memory}
          onClick={() => send({ type: "memory", value: draftMemory })}
        >
          {t("manual.action.memory")}
        </Button>
        <label>
          {t("manual.turn")}
          <select
            value={snapshot.turn}
            disabled={!playable}
            onChange={(e) => send({ type: "turn", seat: Number(e.target.value) as Seat })}
          >
            {snapshot.players.map((p, i) => (
              <option key={i} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </Panel>
      {snapshot.undo ? (
        <Panel as="section" className="manual-undo">
          {snapshot.undo.seat === snapshot.seat ? (
            <p>{t("manual.undoWaiting")}</p>
          ) : (
            <>
              <p>{t("manual.undoPrompt")}</p>
              <Button disabled={!playable} onClick={() => send({ type: "undoReply", accept: true })}>
                {t("manual.accept")}
              </Button>
              <Button
                disabled={!playable}
                variant="secondary"
                onClick={() => send({ type: "undoReply", accept: false })}
              >
                {t("manual.decline")}
              </Button>
            </>
          )}
        </Panel>
      ) : null}
      <div className="manual-layout">
        <div className="manual-board">
          {[opponentSeat, snapshot.seat].map((seat) => {
            const player = snapshot.players[seat];
            if (!player)
              return (
                <section key={seat} className="manual-player">
                  <h2>{t("manual.waiting")}</h2>
                </section>
              );
            const isOwn = seat === snapshot.seat;
            return (
              <section key={seat} className={`manual-player ${isOwn ? "is-own" : ""}`} aria-label={player.name}>
                <h2>
                  {player.name}{" "}
                  <span>
                    {player.connected ? "" : t("manual.disconnected")}
                    {player.ready && snapshot.phase === "setup" ? ` · ${t("manual.ready")}` : ""}
                  </span>
                </h2>
                <div className="manual-pile-summary">
                  {(["deck", "eggDeck", "security", "hand", "trash"] as const).map((z) => (
                    <span key={z}>
                      {zoneLabel(t, z)} <strong>{player[z].length}</strong>
                    </span>
                  ))}
                </div>
                <div className="manual-field-row">
                  {(["battle", "breeding"] as const).map((z) => (
                    <section key={z} aria-label={zoneLabel(t, z)}>
                      <h3>{zoneLabel(t, z)}</h3>
                      <div className="manual-zone">
                        {player[z].map((stack) => (
                          <StackView
                            key={stack.id}
                            stack={stack}
                            selection={isOwn ? selection : undefined}
                            onSelect={isOwn ? setSelection : undefined}
                            t={t}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                {(["hand", "reveal", "trash", "security"] as const)
                  .filter((z) => z === "security" || (z === "hand" ? isOwn : player[z].length > 0))
                  .map((z) => (
                    <section
                      key={z}
                      aria-label={zoneLabel(t, z)}
                      className={`manual-loose-zone manual-loose-zone--${z}`}
                    >
                      <h3>
                        {zoneLabel(t, z)} ({player[z].length})
                      </h3>
                      <div className="manual-zone">
                        {player[z]
                          .filter((card) => z !== "security" || !!card.cardId)
                          .map((card, index) => (
                            <CardButton
                              key={card.id || `hidden-${index}`}
                              card={card}
                              selected={isOwn && card.id === selection?.card}
                              onSelect={isOwn && card.id ? () => setSelection({ card: card.id }) : undefined}
                            />
                          ))}
                      </div>
                    </section>
                  ))}
              </section>
            );
          })}
        </div>
        <aside className="manual-sidebar">
          <Panel as="section" className="manual-controls">
            <h2>{t("manual.selected")}</h2>
            {selectedCard ? (
              <>
                <p>
                  <strong>{cardName(selectedCard)}</strong>
                </p>
                <label>
                  {t("manual.pileTo")}
                  <select value={to} onChange={(e) => setTo(e.target.value as ManualZone)}>
                    {zoneOptions}
                  </select>
                </label>
                {to === "battle" || to === "breeding" ? (
                  <label>
                    {t("manual.targetStack")}
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                      <option value="">{t("manual.newStack")}</option>
                      {own[to]
                        .filter((stack) => stack.id !== selectedStack?.id || stack.cards.length > 1)
                        .map((stack) => (
                          <option key={stack.id} value={stack.id}>
                            {cardName(stack.cards[0]!)} · {stack.cards.length}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : null}
                <label>
                  {t("manual.placement")}
                  <select value={placement} onChange={(e) => setPlacement(e.target.value as typeof placement)}>
                    <option value="top">{t("manual.top")}</option>
                    <option value="bottom">{t("manual.under")}</option>
                    {target ? <option value="link">{t("manual.link")}</option> : null}
                  </select>
                </label>
                <Button disabled={!playable} onClick={() => move(false)}>
                  {t("manual.move")}
                </Button>
                {selectedStack ? (
                  <>
                    <Button
                      disabled={!playable || placement === "link" || target === selectedStack.id}
                      variant="secondary"
                      onClick={() => move(true)}
                    >
                      {t("manual.moveStack")}
                    </Button>
                    <Button
                      disabled={!playable}
                      variant="secondary"
                      onClick={() =>
                        send({ type: "suspend", stack: selectedStack.id, value: !selectedStack.suspended })
                      }
                    >
                      {t(selectedStack.suspended ? "manual.unsuspend" : "manual.suspend")}
                    </Button>
                    <label>
                      {t("manual.dp")}
                      <input
                        type="number"
                        min={-100000}
                        max={100000}
                        value={dp}
                        onChange={(e) => setDp(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      {t("manual.note")}
                      <input maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                    <Button
                      disabled={!playable}
                      variant="secondary"
                      onClick={() => send({ type: "annotate", stack: selectedStack.id, dp, note })}
                    >
                      {t("manual.save")}
                    </Button>
                    <label>
                      {t("manual.attackTarget")}
                      <select value={attackTarget} onChange={(e) => setAttackTarget(e.target.value)}>
                        <option value="">{t("manual.zone.security")}</option>
                        {opponent?.battle.map((stack) => (
                          <option key={stack.id} value={stack.id}>
                            {cardName(stack.cards[0]!)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      disabled={!playable}
                      variant="secondary"
                      onClick={() =>
                        send({ type: "attack", stack: selectedStack.id, target: attackTarget || undefined })
                      }
                    >
                      {t("manual.attack")}
                    </Button>
                  </>
                ) : null}
                <Button
                  disabled={!playable || selectedInPile}
                  variant="secondary"
                  onClick={() => send({ type: "flip", card: selectedCard.id, faceUp: !selectedCard.faceUp })}
                >
                  {t(selectedCard.faceUp ? "manual.flipDown" : "manual.flipUp")}
                </Button>
                {getCardDefinition(selectedCard.cardId) &&
                isTokenDefinition(getCardDefinition(selectedCard.cardId)!) ? (
                  <Button
                    disabled={!playable}
                    variant="secondary"
                    onClick={() => {
                      send({ type: "removeToken", card: selectedCard.id });
                      setSelection(undefined);
                    }}
                  >
                    {t("manual.removeToken")}
                  </Button>
                ) : null}
                <details>
                  <summary>{t("manual.inspectCard")}</summary>
                  <p>{getCardDefinition(selectedCard.cardId)?.effectText}</p>
                  <p>{getCardDefinition(selectedCard.cardId)?.inheritedEffectText}</p>
                </details>
              </>
            ) : (
              <p>{t("manual.selectHint")}</p>
            )}
          </Panel>
          <Panel as="section" className="manual-controls">
            <h2>{t("manual.zone.deck")}</h2>
            <div className="manual-quick-actions">
              <Button disabled={!playable || !own.deck.length} onClick={() => take("deck", "hand")}>
                {t("manual.draw")}
              </Button>
              <Button
                disabled={!playable || !own.eggDeck.length}
                variant="secondary"
                onClick={() => take("eggDeck", "breeding")}
              >
                {t("manual.hatch")}
              </Button>
              <Button
                disabled={!playable || !own.security.length}
                variant="secondary"
                onClick={() => take("security", "reveal")}
              >
                {t("manual.check")}
              </Button>
              <Button
                disabled={!playable || !own.deck.length}
                variant="secondary"
                onClick={() => take("deck", "security")}
              >
                {t("manual.recover")}
              </Button>
            </div>
            <label>
              {t("manual.count")}
              <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </label>
            <Button
              disabled={!playable || count < 1 || count > own.deck.length}
              variant="secondary"
              onClick={() => take("deck", "reveal", count)}
            >
              {t("manual.reveal")}
            </Button>
            <label>
              {t("manual.pileFrom")}
              <select value={from} onChange={(e) => setFrom(e.target.value as typeof from)}>
                {["deck", "eggDeck", "security", "trash", "reveal", "hand"].map((z) => (
                  <option key={z} value={z}>
                    {zoneLabel(t, z as ManualZone)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("manual.pileTo")}
              <select value={pileTo} onChange={(e) => setPileTo(e.target.value as ManualZone)}>
                {zoneOptions}
              </select>
            </label>
            <label className="manual-checkbox">
              <input type="checkbox" checked={bottom} onChange={(e) => setBottom(e.target.checked)} />
              {t("manual.bottom")}
            </label>
            <Button
              disabled={!playable || from === pileTo || count < 1 || count > own[from].length}
              variant="secondary"
              onClick={() => send({ type: "take", from, to: pileTo, count, bottom })}
            >
              {t("manual.take")}
            </Button>
            <label>
              {t("manual.search")}
              <select value={search} onChange={(e) => setSearch(e.target.value as typeof search)}>
                {["deck", "eggDeck", "security"].map((z) => (
                  <option key={z} value={z}>
                    {zoneLabel(t, z as ManualZone)}
                  </option>
                ))}
              </select>
            </label>
            <Button disabled={!playable} variant="secondary" onClick={() => send({ type: "shuffle", zone: search })}>
              {t("manual.shuffle")}
            </Button>
            <Button disabled={!playable} variant="secondary" onClick={() => send({ type: "inspect", zone: search })}>
              {t("manual.search")}
            </Button>
            {snapshot.inspection ? (
              <>
                <p>{t("manual.searchHint")}</p>
                <div className="manual-source-cards">
                  {snapshot.inspection.cards.map((card) => (
                    <CardButton
                      key={card.id}
                      card={card}
                      selected={selection?.card === card.id}
                      onSelect={() => setSelection({ card: card.id })}
                    />
                  ))}
                </div>
                <Button disabled={!playable} variant="secondary" onClick={() => send({ type: "inspect", zone: null })}>
                  {t("manual.closeSearch")}
                </Button>
              </>
            ) : null}
          </Panel>
          <Panel as="section" className="manual-controls">
            <Button
              disabled={!playable || !!snapshot.undo}
              variant="secondary"
              onClick={() => send({ type: "undoRequest" })}
            >
              {t("manual.undo")}
            </Button>
            <Button
              disabled={blocked || snapshot.phase === "over"}
              variant="secondary"
              onClick={() => send({ type: "roll" })}
            >
              {t("manual.roll")}
            </Button>
            <Button
              disabled={blocked || !opponent || snapshot.phase === "over"}
              variant="secondary"
              onClick={() => setConcede(true)}
            >
              {t("manual.concede")}
            </Button>
            <label>
              {t("manual.token")}
              <select value={tokenId} onChange={(event) => setTokenId(event.target.value)}>
                {tokenDefinitions.map((token) => (
                  <option key={token.cardId} value={token.cardId}>
                    {token.nameEn}
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={!playable}
              variant="secondary"
              onClick={() => send({ type: "spawnToken", cardId: tokenId })}
            >
              {t("manual.spawnToken")}
            </Button>
            <h2>{t("manual.history")}</h2>
            <ol className="manual-history" aria-label={t("manual.history")}>
              {snapshot.history.map((entry) => (
                <li key={entry.id}>
                  <strong>{snapshot.players[entry.seat]?.name}</strong> ·{" "}
                  {t(`manual.action.${entry.action}` as TranslationKey)} {entry.detail}
                </li>
              ))}
            </ol>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (message.trim()) {
                  send({ type: "chat", text: message });
                  setMessage("");
                }
              }}
            >
              <label>
                {t("manual.message")}
                <input maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
              </label>
              <Button disabled={blocked || !message.trim()} variant="secondary" type="submit">
                {t("manual.send")}
              </Button>
            </form>
          </Panel>
        </aside>
      </div>
      {concede ? (
        <Dialog labelledBy="manual-concede-title" onClose={() => setConcede(false)}>
          <h2 id="manual-concede-title">{t("manual.concedeConfirm")}</h2>
          <Button variant="secondary" onClick={() => setConcede(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              send({ type: "concede" });
              setConcede(false);
            }}
          >
            {t("manual.concede")}
          </Button>
        </Dialog>
      ) : null}
    </main>
  );
}
