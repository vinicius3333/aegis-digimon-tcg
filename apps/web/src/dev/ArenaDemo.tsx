/* Visual preview of the current arena, using the real match screen without a server. */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CATALOG_DECKS,
  CardInstance,
  CardKind,
  GameState,
  Permanent,
  Phase,
  PlayerState,
  getCardDefinition,
  type Seat,
} from "@aegis/shared";
import {
  BATTLEFIELDS,
  battlefieldById,
  getBattlefieldId,
  setBattlefieldId,
  subscribeBattlefield,
} from "../design/battlefield";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { GameScreen } from "../game/GameScreen";
import { TIMINGS } from "../game/timings";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { createArenaSecurityDemoState } from "./arenaDemoSecurity";
import { prepareDemoCombat } from "./arenaDemoCombat";
import { ArenaKeywordEditor } from "./ArenaKeywordEditor";
import { ArenaDemoTools } from "./ArenaDemoTools";
import { ArenaVisualPlayer } from "./ArenaVisualPlayer";
import { useArenaVisualPlayback } from "./arenaVisualPlayback";
import {
  applyDemoKeywordGrants,
  demoDigimon,
  demoKeywordLabels,
  removeDemoKeywordGrant,
  upsertDemoKeywordGrant,
  type DemoKeywordGrants,
} from "./arenaDemoKeywords";
import "./arenaDemo.css";

function card(cardId: string, instanceId: string, ownerSeat: Seat): CardInstance {
  const result = new CardInstance();
  result.cardId = cardId;
  result.instanceId = instanceId;
  result.ownerSeat = ownerSeat;
  return result;
}

function fighter(cardId: string, permanentId: string, seat: Seat, sources: string[] = []): Permanent {
  const result = new Permanent();
  result.permanentId = permanentId;
  result.controllerSeat = seat;
  result.topCard = card(cardId, `${permanentId}-top`, seat);
  result.baseDP = getCardDefinition(cardId)?.dp ?? 0;
  result.currentDP = result.baseDP;
  result.stack.push(...sources.map((id, index) => card(id, `${permanentId}-source-${index}`, seat)));
  return result;
}

function previewHandSize(parameter: "hand" | "opponentHand"): number {
  const requested = Number(new URLSearchParams(window.location.search).get(parameter) ?? 5);
  return Number.isInteger(requested) ? Math.max(1, Math.min(20, requested)) : 5;
}

type DemoPermanent = {
  cardId: string;
  id: string;
  sources?: readonly string[];
  suspended?: boolean;
};

const ARENA_DECKS: readonly {
  recipeId: string;
  name: string;
  breeding: DemoPermanent;
  battle: readonly DemoPermanent[];
  hand: readonly string[];
  trash: readonly string[];
}[] = [
  {
    recipeId: "bt26-dgo-2026-08-28-7-chronomon",
    name: "BT26 Chronomon",
    breeding: { cardId: "BT26-009", id: "you-breeding", sources: ["BT26-001"] },
    battle: [
      {
        cardId: "BT26-016",
        id: "you-chronomon",
        sources: ["BT26-001", "BT26-009", "BT26-011", "BT26-015"],
      },
      { cardId: "BT26-009", id: "you-hyokomon" },
      { cardId: "BT26-092", id: "you-shota" },
    ],
    hand: ["BT26-009", "BT26-011", "BT26-016", "BT26-087", "BT8-095"],
    trash: ["BT26-015", "BT8-095"],
  },
  {
    recipeId: "bt26-dgo-2026-08-28-8-plutomon",
    name: "BT26 Plutomon",
    breeding: { cardId: "BT26-066", id: "opponent-breeding", sources: ["BT24-007"] },
    battle: [
      {
        cardId: "BT26-059",
        id: "opponent-plutomon",
        sources: ["BT24-007", "BT26-066", "BT26-069", "BT26-074"],
      },
      { cardId: "BT26-069", id: "opponent-dobermon", suspended: true },
      { cardId: "BT24-088", id: "opponent-asuna" },
    ],
    hand: ["BT26-059", "BT26-079", "BT26-074", "BT26-056", "BT26-100"],
    trash: ["BT26-074", "BT26-100"],
  },
];

function previewRecipe(recipeId: string) {
  const recipe = CATALOG_DECKS.find((deck) => deck.deckId === recipeId);
  if (!recipe) throw new Error(`Unknown arena demo deck: ${recipeId}`);
  return recipe;
}

export function createArenaDemoState(drawCounts: readonly [number, number] = [0, 0]): GameState {
  if (new URLSearchParams(window.location.search).get("scenario") === "security") {
    return createArenaSecurityDemoState(drawCounts);
  }
  const state = new GameState();
  state.matchId = "arena-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  for (const seat of [0, 1] as const) {
    const preview = ARENA_DECKS[seat]!;
    const recipe = previewRecipe(preview.recipeId);
    const remaining = [...recipe.decklist.mainDeck];
    const eggs = [...recipe.decklist.eggDeck];
    function take(cardId: string) {
      const pool = getCardDefinition(cardId)?.kinds.includes(CardKind.DigiEgg) ? eggs : remaining;
      const index = pool.indexOf(cardId);
      if (index < 0) throw new Error(`Arena demo uses too many copies of ${cardId} from ${recipe.deckId}`);
      pool.splice(index, 1);
      return cardId;
    }
    function permanent(piece: DemoPermanent) {
      const result = fighter(take(piece.cardId), piece.id, seat, piece.sources?.map((cardId) => take(cardId)) ?? []);
      result.isSuspended = piece.suspended ?? false;
      return result;
    }
    const player = new PlayerState();
    player.seat = seat;
    player.displayName = preview.name;
    player.sessionId = `arena-demo-${seat}`;
    player.breeding = permanent(preview.breeding);
    player.breeding.inBreeding = true;
    player.battleArea.push(...preview.battle.map(permanent));
    player.trash.push(...preview.trash.map((cardId, index) => card(take(cardId), `trash-${seat}-${index}`, seat)));

    const handSize = previewHandSize(seat === 0 ? "hand" : "opponentHand");
    const hand = preview.hand.slice(0, handSize).map(take);
    const variety = [...new Set(remaining)];
    for (let index = 0; hand.length < handSize; index += 1) {
      const cardId = variety[index % variety.length]!;
      if (remaining.includes(cardId)) hand.push(take(cardId));
    }
    // Opponent hand and both security zones stay hidden, as in the server's public view.
    if (seat === 0) player.hand.push(...hand.map((cardId, index) => card(cardId, `hand-${index}`, seat)));
    player.handCount = handSize;
    player.securityCount = 5;
    remaining.splice(0, player.securityCount);
    const drawn = remaining.splice(0, Math.max(0, Math.floor(drawCounts[seat])));
    if (seat === 0) player.hand.push(...drawn.map((cardId, index) => card(cardId, `draw-${seat}-${index}`, seat)));
    player.handCount += drawn.length;
    player.deckCount = remaining.length;
    player.eggDeckCount = eggs.length;
    state.players.push(player);
  }
  return state;
}

export function ArenaDemo() {
  const { locale, t } = useTranslation();
  const portuguese = locale === "pt-BR";
  const securityScenario = new URLSearchParams(window.location.search).get("scenario") === "security";
  const [securityFaceDownCount, setSecurityFaceDownCount] = useState(0);
  const [phase, setPhase] = useState(Phase.Main);
  const [batches, setBatches] = useState<ServerBatch[]>([]);
  const [keywordGrants, setKeywordGrants] = useState<DemoKeywordGrants>({});
  const [keywordEditorOpen, setKeywordEditorOpen] = useState(false);
  const [drawCounts, setDrawCounts] = useState<readonly [number, number]>([0, 0]);
  const [turnStartStep, setTurnStartStep] = useState<"prepare" | Phase.Active | Phase.Draw | Phase.Breeding | null>(
    null,
  );
  const [turnStartRun, setTurnStartRun] = useState(0);
  const keywordLabels = useMemo(() => demoKeywordLabels(keywordGrants), [keywordGrants]);
  const events = useMemo(() => batches.flatMap((batch) => batch.events), [batches]);
  const state = useMemo(() => {
    const next = createArenaDemoState(drawCounts);
    next.phase = phase;
    if (securityScenario) {
      for (let index = 0; index < securityFaceDownCount; index++) {
        const card = next.players[0]?.security[index + 2];
        if (card) {
          card.faceUp = false;
          card.cardId = "";
          card.artId = "";
        }
      }
      const partner = next.players[0]?.battleArea[0];
      if (partner) partner.currentDP = partner.baseDP + Math.max(0, 2 - securityFaceDownCount) * 1000;
    }
    applyDemoKeywordGrants(next, keywordGrants);
    prepareDemoCombat(next);
    if (turnStartStep !== null) {
      for (const permanent of next.players[0]!.battleArea) {
        permanent.isSuspended = turnStartStep === "prepare";
        permanent.canAttackPlayer = false;
        permanent.attackablePermanentIds.clear();
      }
    }
    return next;
  }, [phase, keywordGrants, drawCounts, turnStartStep, securityScenario, securityFaceDownCount]);
  const playback = useArenaVisualPlayback(state, keywordLabels, portuguese);
  function drawCard(seat: Seat) {
    if (!state.players.find((player) => player.seat === seat)?.deckCount) return;
    setDrawCounts((previous) => (seat === 0 ? [previous[0] + 1, previous[1]] : [previous[0], previous[1] + 1]));
  }
  function previewPhase(next: Phase) {
    setPhase(next);
    const batch = singleServerBatch([{ kind: "phaseChanged", phase: next, turnSeat: 0, turnCount: 5 }]);
    setBatches((previous) => [...previous, batch]);
  }
  function previewTurnStart() {
    if (turnStartStep !== null || !state.players[0]!.deckCount) return;
    // A fresh screen clears any individually queued phase previews and establishes
    // the suspended board as the baseline before the unsuspend animation begins.
    setTurnStartRun((run) => run + 1);
    setBatches([]);
    setPhase(Phase.Main);
    setTurnStartStep("prepare");
  }
  useEffect(() => {
    if (turnStartStep === null) return;
    const timer = setTimeout(
      () => {
        const next =
          turnStartStep === "prepare"
            ? Phase.Active
            : turnStartStep === Phase.Active
              ? Phase.Draw
              : turnStartStep === Phase.Draw
                ? Phase.Breeding
                : null;
        if (next !== null) {
          previewPhase(next);
          if (next === Phase.Draw) drawCard(0);
        }
        setTurnStartStep(next);
      },
      turnStartStep === "prepare" ? 600 : TIMINGS.phaseBanner,
    );
    return () => clearTimeout(timer);
    // Each step owns its timer; other demo controls are disabled during playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnStartStep]);
  const battlefieldId = useSyncExternalStore(subscribeBattlefield, getBattlefieldId, getBattlefieldId);

  return (
    <div className="aegis-arena-demo">
      <header
        className="aegis-arena-demo-toolbar"
        inert={playback.controller.active}
        aria-hidden={playback.controller.active || undefined}
      >
        <div className="aegis-arena-demo-brand">
          <span aria-hidden="true">
            <Icons.Hexagon size={20} />
          </span>
          <strong>{portuguese ? "Prévia da arena" : "Arena preview"}</strong>
        </div>
        <label className="aegis-arena-demo-field">
          <span className="aegis-arena-demo-field-icon" aria-hidden="true">
            <Icons.Map size={16} />
          </span>
          <span className="aegis-arena-demo-field-label">{portuguese ? "Cenário" : "Backdrop"}</span>
          <select value={battlefieldId} onChange={(event) => setBattlefieldId(event.target.value)}>
            {BATTLEFIELDS.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
            {!BATTLEFIELDS.some((field) => field.id === battlefieldId) && (
              <option value={battlefieldId}>{battlefieldById(battlefieldId).label}</option>
            )}
          </select>
        </label>
        <label className="aegis-arena-demo-field aegis-arena-demo-field--phase">
          <span className="aegis-arena-demo-field-icon" aria-hidden="true">
            <Icons.Clock size={16} />
          </span>
          <span className="aegis-arena-demo-field-label">{portuguese ? "Fase" : "Phase"}</span>
          <select
            disabled={turnStartStep !== null}
            value={phase}
            onChange={(event) => previewPhase(event.target.value as Phase)}
          >
            {[Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End].map((item) => (
              <option key={item} value={item}>
                {t(`game.phase.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="aegis-arena-demo-replay"
          type="button"
          onClick={() => previewPhase(phase)}
          disabled={turnStartStep !== null}
          aria-label={portuguese ? "Repetir animação da fase" : "Replay phase animation"}
          title={portuguese ? "Repetir animação da fase" : "Replay phase animation"}
        >
          <span aria-hidden="true">
            <Icons.Play size={16} />
          </span>
          <span className="aegis-arena-demo-replay-label">{portuguese ? "Repetir" : "Replay"}</span>
        </button>
        <ArenaDemoTools
          portuguese={portuguese}
          deckCounts={[state.players[0]!.deckCount, state.players[1]!.deckCount]}
          onKeywords={() => setKeywordEditorOpen(true)}
          onSecurityFlip={
            securityScenario ? () => setSecurityFaceDownCount((count) => (count === 3 ? 0 : count + 1)) : undefined
          }
          securityFaceUpCount={3 - securityFaceDownCount}
          onDraw={drawCard}
          onVisualPlayback={playback.controller.controls.start}
          onTurnStart={previewTurnStart}
          disabled={turnStartStep !== null}
        />
        <span className="aegis-arena-demo-note" role="status">
          {turnStartStep !== null
            ? portuguese
              ? "Reproduzindo início do turno…"
              : "Playing turn start…"
            : portuguese
              ? "Sem partida ativa"
              : "No active match"}
        </span>
        <a className="aegis-arena-demo-back" href="/" aria-label={portuguese ? "Voltar ao início" : "Back to home"}>
          <span aria-hidden="true">
            <Icons.ArrowLeft size={16} />
          </span>
          <span className="aegis-arena-demo-back-label">{portuguese ? "Voltar" : "Back"}</span>
        </a>
      </header>
      {playback.controller.active ? <ArenaVisualPlayer playback={playback.controller} /> : null}
      <GameScreen
        key={`${playback.gameKey}-${turnStartRun}`}
        joinOptions={{
          displayName: ARENA_DECKS[0]!.name,
          deck: {
            mainDeck: [...previewRecipe(ARENA_DECKS[0]!.recipeId).decklist.mainDeck],
            eggDeck: [...previewRecipe(ARENA_DECKS[0]!.recipeId).decklist.eggDeck],
          },
        }}
        identityColor="Red"
        onExit={() => window.location.assign("/")}
        demoConnection={{
          room: undefined,
          showCutIns: playback.controller.active ? true : undefined,
          keywordLabels: playback.connection?.keywordLabels ?? keywordLabels,
          status: "connected",
          state: playback.connection?.state ?? state,
          events: playback.connection?.events ?? events,
          batches: playback.connection?.batches ?? batches,
          snapshots: playback.connection?.snapshots,
          decision: undefined,
          acknowledgeDecision: () => {},
          error: undefined,
          sessionId: "arena-demo-0",
          roomCode: "",
        }}
      />
      {keywordEditorOpen ? (
        <ArenaKeywordEditor
          digimon={demoDigimon(state)}
          grants={keywordGrants}
          onGrant={(id, grant) => setKeywordGrants((previous) => upsertDemoKeywordGrant(previous, id, grant))}
          onRemove={(id, keyword) => setKeywordGrants((previous) => removeDemoKeywordGrant(previous, id, keyword))}
          onReset={() => setKeywordGrants({})}
          onClose={() => setKeywordEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}
