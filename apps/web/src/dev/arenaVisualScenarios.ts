import {
  CardInstance,
  CardKind,
  Phase,
  getCardDefinition,
  type GameState,
  type Permanent,
  type ServerEvent,
} from "@aegis/shared";
import { snapshotGameState } from "../net/presentedState";
import {
  DEMO_KEYWORDS,
  NUMERIC_KEYWORDS,
  TEXT_KEYWORDS,
  demoKeywordLabel,
  demoKeywordName,
  type DemoKeyword,
} from "./arenaDemoKeywords";
import { applyArenaVisualZoneScene, prepareArenaVisualZoneScene } from "./arenaVisualZoneScenes";

type Mechanism =
  | "attack"
  | "block"
  | "security"
  | "piercing"
  | "alliance"
  | "unsuspend"
  | "evolve"
  | "draw"
  | "recovery"
  | "memory"
  | "zone"
  | "evade"
  | "barrier"
  | "protect"
  | "respawn"
  | "retaliation"
  | "ice"
  | "progress"
  | "succession"
  | "option"
  | "fragment";
const mechanisms: Record<DemoKeyword, Mechanism> = {
  Blocker: "block",
  Piercing: "piercing",
  Rush: "attack",
  Raid: "attack",
  Reboot: "unsuspend",
  Jamming: "security",
  Retaliation: "retaliation",
  Barrier: "barrier",
  Evade: "evade",
  Save: "zone",
  Delay: "option",
  Alliance: "alliance",
  Fortitude: "respawn",
  Blitz: "attack",
  Collision: "block",
  Vortex: "attack",
  Decoy: "protect",
  Scapegoat: "protect",
  Execute: "attack",
  Progress: "progress",
  IceClad: "ice",
  Training: "memory",
  "Armor Purge": "zone",
  "Mind Link": "zone",
  Ascension: "evolve",
  BlastDigivolve: "evolve",
  BlastDNADigivolve: "evolve",
  Draw: "draw",
  SecurityAttack: "security",
  DeDigivolve: "zone",
  Recovery: "recovery",
  DigiBurst: "zone",
  Digisorption: "memory",
  MaterialSave: "zone",
  Link: "zone",
  Fragment: "fragment",
  Partition: "respawn",
  Decode: "respawn",
  Overclock: "attack",
  UseReq: "option",
  Engage: "attack",
  Guard: "protect",
  Detach: "zone",
  Succession: "succession",
};

const descriptions: Record<Mechanism, { pt: string; en: string; cue: string; captureAtMs: number }> = {
  attack: {
    pt: "Observe a declaração e o confronto no campo. A mesma animação é compartilhada por estas habilidades de combate; os eventos são roteirizados, sem executar regras.",
    en: "Watch the declaration and field clash. Combat abilities share this animation; events are scripted, without executing rules.",
    cue: ".game-attack-arrow / .game-claw",
    captureAtMs: 2600,
  },
  block: {
    pt: "Observe a interceptação e o confronto após o bloqueio. A janela de decisão é omitida nesta reprodução automática.",
    en: "Watch the interception and clash after blocking. The decision window is omitted in automatic playback.",
    cue: ".game-attack-arrow / .game-claw",
    captureAtMs: 2900,
  },
  security: {
    pt: "Observe a quebra, revelação e resolução de segurança. Jamming mantém o atacante de 1000 DP contra uma carta de 2000 DP; Security Attack mostra duas checagens. A proteção e os resultados são roteirizados.",
    en: "Watch the security break, reveal and resolution. Jamming keeps the 1000 DP attacker alive against a 2000 DP card; Security Attack shows two checks. Protection and outcomes are scripted.",
    cue: ".battle-clash",
    captureAtMs: 2400,
  },
  piercing: {
    pt: "Observe o confronto seguido de uma checagem de segurança. É uma sequência visual roteirizada de Piercing.",
    en: "Watch a field clash followed by a security check. This is a scripted Piercing visual sequence.",
    cue: ".battle-clash",
    captureAtMs: 4400,
  },
  alliance: {
    pt: "Observe o aliado suspender e o DP aumentar antes do confronto. O pulso de DP é uma animação compartilhada.",
    en: "Watch the ally suspend and DP increase before the clash. The DP pulse is a shared animation.",
    cue: ".game-dp-pulse",
    captureAtMs: 1300,
  },
  unsuspend: {
    pt: "Observe o Digimon voltar da posição suspensa. Esta mudança de estado reutiliza a animação de suspensão.",
    en: "Watch the Digimon return from its suspended position. This state change reuses the suspension animation.",
    cue: "suspended → unsuspended",
    captureAtMs: 800,
  },
  evolve: {
    pt: "Observe a digievolução e as partículas existentes. Blast usa o cut-in compartilhado; esta prévia não valida materiais, custos ou uma jogada legal.",
    en: "Watch the existing digivolution and particles. Blast uses the shared cut-in; this preview does not validate materials, costs or a legal play.",
    cue: ".game-cut-in",
    captureAtMs: 1800,
  },
  draw: {
    pt: "Observe a carta voar do deck para a mão e o contador aumentar. Esta compra pertence apenas ao cenário, sem alterar suas compras manuais.",
    en: "Watch a card fly from deck to hand and the counter increase. This draw belongs only to the scene and does not change manual draws.",
    cue: ".game-draw-flight",
    captureAtMs: 750,
  },
  recovery: {
    pt: "Observe o ganho de segurança e a indicação de recuperação. A origem é representada por movimento de zona, sem revelar cartas ocultas.",
    en: "Watch the security gain and recovery notice. The source is represented by a zone movement without revealing hidden cards.",
    cue: "security gain / recovery notice",
    captureAtMs: 1200,
  },
  memory: {
    pt: "Observe o marcador de memória mudar. Redução de custo compartilha esta indicação; esta prévia não calcula custos de cartas.",
    en: "Watch the memory marker move. Cost reduction shares this indicator; this preview does not calculate card costs.",
    cue: ".game-memory-gauge__track",
    captureAtMs: 1000,
  },
  retaliation: {
    pt: "Observe o ataque do oponente, a derrota do seu Digimon e a retaliação removendo também o atacante. O resultado é roteirizado e reutiliza o confronto existente.",
    en: "Watch the opponent attack, your Digimon lose and retaliation remove the attacker too. The outcome is scripted and reuses the existing clash.",
    cue: ".game-claw / .game-delete-burst",
    captureAtMs: 2900,
  },
  ice: {
    pt: "Observe o ataque do oponente: seu Digimon tem menos DP, mas mais fontes, e vence a comparação por fontes. A animação é de confronto compartilhada; a comparação é um resultado roteirizado.",
    en: "Watch the opponent attack: your Digimon has less DP but more sources and wins the source comparison. The clash animation is shared; the comparison is a scripted outcome.",
    cue: ".game-attack-arrow / .game-claw",
    captureAtMs: 2900,
  },
  progress: {
    pt: "Durante o ataque do seu Digimon, um efeito do oponente ameaça os Digimon de menor nível. O atacante permanece enquanto o aliado é removido. É uma interação roteirizada, sem executar imunidade no motor.",
    en: "During your Digimon's attack an opponent effect threatens the lowest-level Digimon. The attacker remains while the ally is removed. This is a scripted interaction, without executing engine immunity.",
    cue: ".game-attack-arrow / .game-delete-burst",
    captureAtMs: 2400,
  },
  succession: {
    pt: "Observe o oponente atacar e consulte as fontes nos detalhes durante o confronto. A cópia de efeitos de Succession não é executada; este cenário permite observar a carta com a habilidade num contexto de combate.",
    en: "Watch the opponent attack and inspect sources during the clash. Succession effect copying is not executed; this scene shows the ability in a combat context.",
    cue: ".game-attack-arrow / inherited sources in inspector",
    captureAtMs: 2700,
  },
  option: {
    pt: "Observe uma opção real do catálogo: Delay consome a opção para ganhar memória; Use Req. mostra sua entrada e um efeito. Entrada, exclusão e marcador são compartilhados; requisitos e custos não são validados.",
    en: "Watch a real catalog Option: Delay consumes it to gain memory; Use Req. shows its arrival and an effect. Arrival, deletion and the marker are shared; requirements and costs are not validated.",
    cue: ".game-delete-burst / .game-zone-showcase / memory",
    captureAtMs: 2200,
  },
  fragment: {
    pt: "Observe o ataque do oponente e o pagamento de uma fonte para manter seu Digimon em campo. O cenário representa Fragment (1) com movimento de zona e confronto compartilhados.",
    en: "Watch the opponent attack and a source be paid to keep your Digimon on the field. This scene represents Fragment (1) with shared zone movement and clash effects.",
    cue: ".game-attack-arrow / source count",
    captureAtMs: 2600,
  },
  zone: {
    pt: "Observe o movimento das fontes, vínculos ou carta do topo e sua indicação de zona. São efeitos visuais compartilhados; custos e condições da habilidade não são validados.",
    en: "Watch sources, links or the top card move and their zone indication. These are shared visual effects; the ability's costs and conditions are not validated.",
    cue: "zone panel / source count / linked count / top art",
    captureAtMs: 1800,
  },
  evade: {
    pt: "Observe a suspensão para evitar a remoção. O cenário representa a consequência com a animação compartilhada de suspensão, sem abrir uma decisão.",
    en: "Watch the suspension that avoids removal. The scene represents the outcome with the shared suspension animation, without opening a decision.",
    cue: "unsuspended → suspended",
    captureAtMs: 2100,
  },
  barrier: {
    pt: "Observe a segurança ser consumida e o Digimon permanecer. A quebra da carta de segurança é um efeito compartilhado, não uma animação exclusiva de Barrier.",
    en: "Watch security be consumed while the Digimon remains. The security card break is a shared effect, not a dedicated Barrier animation.",
    cue: ".battle-clash / security counter",
    captureAtMs: 2400,
  },
  protect: {
    pt: "Observe o ataque do oponente disparar um efeito de exclusão: Guard e Decoy sacrificam o portador para proteger o aliado; Scapegoat sacrifica o aliado para proteger o portador. Os requisitos não são executados.",
    en: "Watch the opponent attack trigger a deletion effect: Guard and Decoy sacrifice their bearer to protect the ally; Scapegoat sacrifices the ally to protect its bearer. Requirements are not executed.",
    cue: ".game-delete-burst",
    captureAtMs: 2400,
  },
  respawn: {
    pt: "Observe a exclusão seguida do retorno da carta ou de fontes ao campo. Entrada e exclusão usam efeitos compartilhados, sem validar a habilidade ou disparar regras.",
    en: "Watch deletion followed by the card or sources returning to the field. Arrival and deletion use shared effects, without validating the ability or triggering rules.",
    cue: ".game-delete-burst / .game-zone-showcase",
    captureAtMs: 5000,
  },
};

export interface ArenaVisualScenarioInfo {
  keyword: DemoKeyword;
  title: string;
  description: string;
  capability: "animated" | "interaction";
  expectedCue: string;
  captureAtMs: number;
}
export function arenaVisualCatalog(portuguese = false): ArenaVisualScenarioInfo[] {
  return DEMO_KEYWORDS.map((keyword) => {
    const mechanism = mechanisms[keyword];
    const info = descriptions[mechanism];
    return {
      keyword,
      title: demoKeywordName(keyword),
      description: portuguese ? info.pt : info.en,
      capability: mechanism === "succession" || mechanism === "progress" ? "interaction" : "animated",
      expectedCue: info.cue,
      captureAtMs: info.captureAtMs,
    };
  });
}
export interface ArenaVisualStage {
  atMs: number;
  label: string;
  beforeState: GameState;
  state: GameState;
  events: readonly ServerEvent[];
}
export interface ArenaVisualScene {
  initialState: GameState;
  stages: readonly ArenaVisualStage[];
  durationMs: number;
  keywordLabels: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

function looseCard(cardId: string, instanceId: string, seat: 0 | 1) {
  const card = new CardInstance();
  card.cardId = cardId;
  card.instanceId = instanceId;
  card.ownerSeat = seat;
  return card.toJSON() as CardInstance;
}
/** Fresh public snapshots isolate scripted presentation from the manual demo and the engine. */
export function buildArenaVisualScene(
  base: GameState,
  keyword: DemoKeyword,
  portuguese = false,
  baselineLabels: ArenaVisualScene["keywordLabels"] = {},
): ArenaVisualScene {
  const state = snapshotGameState(base);
  state.stateVersion = 0;
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.gameOver = false;
  state.pendingDecision = undefined;
  state.combatWindow = undefined;
  const own = state.players.find((player) => player.seat === 0)!;
  const opp = state.players.find((player) => player.seat === 1)!;
  const isDigimon = (permanent: Permanent) =>
    !!getCardDefinition(permanent.topCard?.cardId ?? "")?.kinds.includes(CardKind.Digimon);
  const actor = own.battleArea.find(isDigimon)!;
  const defender = opp.battleArea.find(isDigimon)!;
  const ally = own.battleArea.find((piece) => piece !== actor && isDigimon(piece));
  actor.isSuspended = false;
  actor.summoningSick = false;
  actor.cannotAttack = false;
  actor.currentDP = 15000;
  if (!actor.keywords.includes(keyword)) actor.keywords.push(keyword);
  if (!actor.grantedKeywords.includes(keyword)) actor.grantedKeywords.push(keyword);
  const numeric = NUMERIC_KEYWORDS[keyword];
  const amount = numeric ? (keyword === "SecurityAttack" ? 1 : numeric.initial) : undefined;
  const parameter =
    keyword === "Decoy" && ally ? getCardDefinition(ally.topCard!.cardId)?.colors[0] : TEXT_KEYWORDS[keyword];
  const grant = { keyword, ...(amount !== undefined ? { amount } : {}), ...(parameter ? { parameter } : {}) };
  if (keyword === "SecurityAttack") actor.securityAttack = 2;
  const keywordLabels = {
    ...baselineLabels,
    [actor.permanentId]: { ...baselineLabels[actor.permanentId], [keyword]: demoKeywordLabel(grant) },
  };
  const mechanism = mechanisms[keyword];
  const defensive = ["evade", "barrier", "protect", "respawn", "retaliation", "ice", "succession", "fragment"].includes(
    mechanism,
  );
  if (defensive) {
    state.turnSeat = 1;
    actor.isSuspended = true;
    defender.isSuspended = false;
  }
  defender.isSuspended = keyword !== "Raid";
  if (keyword === "Blocker") {
    state.turnSeat = 1;
    defender.isSuspended = false;
  }
  if (keyword === "Retaliation" || keyword === "Jamming") actor.currentDP = 1000;
  if (
    mechanism === "barrier" ||
    mechanism === "evade" ||
    mechanism === "respawn" ||
    mechanism === "protect" ||
    mechanism === "fragment"
  )
    actor.currentDP = 4000;
  if (mechanism === "protect") {
    defender.topCard = looseCard("EX2-010", "visual-effect-attacker", 1);
    defender.baseDP = 8000;
    defender.currentDP = 8000;
    own.securityCount = Math.max(1, own.securityCount);
    if (keyword !== "Scapegoat" && ally) {
      actor.isSuspended = false;
      ally.isSuspended = true;
    }
  }
  if (mechanism === "evade") {
    actor.isSuspended = false;
    state.phase = Phase.End;
    if (!defender.keywords.includes("Vortex")) defender.keywords.push("Vortex");
  }
  if (mechanism === "ice") {
    actor.currentDP = 1000;
    opp.trash.push(...defender.stack.splice(1, defender.stack.length - 1));
  }
  if (mechanism === "progress") actor.topCard = looseCard("BT26-009", "visual-progress-attacker", 0);
  if (keyword === "Collision" && !defender.keywords.includes("Blocker")) defender.keywords.push("Blocker");
  if (mechanism === "unsuspend") actor.isSuspended = true;
  if (mechanism === "evolve") actor.topCard = looseCard("BT26-015", "visual-evolve-before", 0);
  if (mechanism === "draw" || mechanism === "recovery") own.deckCount = Math.max(1, own.deckCount);
  if (mechanism === "barrier") own.securityCount = Math.max(1, own.securityCount);
  if (
    keyword === "Partition" &&
    actor.stack.filter((source) => getCardDefinition(source.cardId)?.level === 4).length < 2
  )
    actor.stack.push(looseCard("BT26-011", "visual-partition-material", 0));
  prepareArenaVisualZoneScene({ keyword, state, actor, own, opp });
  if (defensive) defender.isSuspended = false;
  const optionCard =
    mechanism === "option"
      ? looseCard(keyword === "Delay" ? "BT10-097" : "BT25-093", "visual-option-top", 0)
      : undefined;
  const optionPiece = optionCard
    ? ({
        ...actor,
        permanentId: "visual-option",
        topCard: optionCard,
        stack: [],
        linked: [],
        keywords: [keyword],
        grantedKeywords: [],
        baseDP: 0,
        currentDP: 0,
        isSuspended: false,
      } as unknown as Permanent)
    : undefined;
  if (keyword === "Delay" && optionPiece) own.battleArea.push(optionPiece);
  if (keyword === "UseReq" && optionCard) {
    own.hand.push(optionCard);
    own.handCount++;
  }
  const stages: ArenaVisualStage[] = [];
  const initialState = snapshotGameState(state);
  function stage(atMs: number, pt: string, en: string, events: readonly ServerEvent[], change: () => void = () => {}) {
    const beforeState = snapshotGameState(state);
    beforeState.stateVersion = ++state.stateVersion;
    change();
    state.stateVersion++;
    stages.push({ atMs, label: portuguese ? pt : en, beforeState, state: snapshotGameState(state), events });
  }
  function declaration(target: "security" | "field", atMs = 600) {
    stage(
      atMs,
      "Declaração de ataque",
      "Attack declaration",
      [
        {
          kind: "attackDeclared",
          seat: 0,
          attackerPermanentId: actor.permanentId,
          attackerCardId: actor.topCard!.cardId,
          target: target === "security" ? { kind: "player" } : { kind: "permanent", permanentId: defender.permanentId },
          ...(target === "field" ? { targetCardId: defender.topCard!.cardId } : {}),
        },
      ],
      () => {
        actor.isSuspended = true;
      },
    );
  }
  function incoming(target = actor, toPlayer = false) {
    stage(
      600,
      "Ataque do oponente",
      "Opponent attack",
      [
        {
          kind: "attackDeclared",
          seat: 1,
          attackerPermanentId: defender.permanentId,
          attackerCardId: defender.topCard!.cardId,
          target: toPlayer ? { kind: "player" } : { kind: "permanent", permanentId: target.permanentId },
          ...(!toPlayer ? { targetCardId: target.topCard!.cardId } : {}),
        },
      ],
      () => {
        defender.isSuspended = true;
      },
    );
  }
  function endIncoming(atMs: number, deleted: Permanent[] = []) {
    stage(
      atMs,
      "Resultado do ataque",
      "Attack outcome",
      [
        {
          kind: "combatResolved",
          seat: 1,
          attackerPermanentId: defender.permanentId,
          deletedPermanentIds: deleted.map((piece) => piece.permanentId),
        },
      ],
      () => {
        for (const piece of deleted) {
          const owner = piece === defender ? opp : own;
          owner.battleArea.splice(owner.battleArea.indexOf(piece), 1);
          owner.trash.push(piece.topCard!, ...piece.stack, ...piece.linked);
        }
      },
    );
  }
  function clash(atMs = 2200) {
    const losers = keyword === "Retaliation" ? [actor, defender] : [defender];
    stage(
      atMs,
      "Confronto no campo",
      "Field clash",
      [
        {
          kind: "combatResolved",
          seat: 0,
          attackerPermanentId: actor.permanentId,
          deletedPermanentIds: losers.map((loser) => loser.permanentId),
        },
      ],
      () => {
        for (const loser of losers) {
          const owner = loser === actor ? own : opp;
          owner.battleArea.splice(owner.battleArea.indexOf(loser), 1);
          owner.trash.push(loser.topCard!, ...loser.stack, ...loser.linked);
        }
      },
    );
  }
  function security(atMs: number) {
    const revealedCardId = "BT26-066";
    stage(
      atMs,
      "Checagem de segurança",
      "Security check",
      [
        {
          kind: "securityRevealed",
          seat: 1,
          revealedCardId,
          attackerPermanentId: actor.permanentId,
          isDigimon: true,
          hasSecurityEffect: false,
          attackerDP: actor.currentDP,
          securityCardDP: 2000,
        },
        {
          kind: "securityChecked",
          seat: 1,
          revealedCardId,
          resolution: "battle",
          battle: {
            attackerDP: actor.currentDP,
            securityCardDP: 2000,
            attackerDeleted: false,
            securityDigimonDeleted: true,
          },
        },
      ],
      () => {
        opp.securityCount = Math.max(0, opp.securityCount - 1);
        opp.trash.push(looseCard(revealedCardId, `visual-security-${atMs}`, 1));
      },
    );
  }
  if (applyArenaVisualZoneScene({ keyword, state, actor, own, opp, stage, portuguese })) {
    // The zone module owns these scripted source/link/top-card movements.
  } else if (mechanism === "evade") {
    incoming();
    stage(
      1600,
      "Suspensão para evitar remoção",
      "Suspension to avoid removal",
      [{ kind: "evadeResolved", permanentId: actor.permanentId, accepted: true }],
      () => {
        actor.isSuspended = true;
      },
    );
    endIncoming(3000);
  } else if (mechanism === "barrier") {
    incoming();
    stage(
      1600,
      "Pagamento de segurança e proteção",
      "Security payment and protection",
      [
        { kind: "barrierResolved", permanentId: actor.permanentId, accepted: true },
        {
          kind: "cardsMoved",
          seat: 0,
          instanceIds: ["visual-barrier-security"],
          cardIds: ["BT26-009"],
          from: "security",
          to: "trash",
        },
      ],
      () => {
        own.securityCount--;
        own.trash.push(looseCard("BT26-009", "visual-barrier-security", 0));
      },
    );
    endIncoming(3700);
  } else if (mechanism === "protect") {
    // The attack targets security; its triggered effect threatens a field Digimon.
    // Protection replaces that effect deletion, never the later security battle.
    incoming(actor, true);
    const sacrificed = keyword === "Scapegoat" && ally ? ally : actor;
    stage(
      1600,
      "Efeito de exclusão, sacrifício e proteção",
      "Deletion effect, sacrifice and protection",
      [
        {
          kind: "effectTriggered",
          seat: 1,
          sourceCardId: defender.topCard!.cardId,
          effectKey: "visual/when-attacking-delete",
          timing: "WhenAttacking",
          description: "An opposing deletion effect is replaced by a scripted protection payment.",
        },
        {
          kind: "cardsMoved",
          seat: 0,
          instanceIds: [sacrificed.topCard!.instanceId],
          cardIds: [sacrificed.topCard!.cardId],
          from: "battleArea",
          to: "trash",
        },
      ],
      () => {
        own.battleArea.splice(own.battleArea.indexOf(sacrificed), 1);
        own.trash.push(sacrificed.topCard!, ...sacrificed.stack, ...sacrificed.linked);
      },
    );
    stage(
      3700,
      "O ataque continua contra sua segurança",
      "The attack continues against your security",
      [
        {
          kind: "securityRevealed",
          seat: 0,
          revealedCardId: "BT26-009",
          attackerPermanentId: defender.permanentId,
          isDigimon: true,
          hasSecurityEffect: false,
          attackerDP: defender.currentDP,
          securityCardDP: 2000,
        },
        {
          kind: "securityChecked",
          seat: 0,
          revealedCardId: "BT26-009",
          resolution: "battle",
          battle: {
            attackerDP: defender.currentDP,
            securityCardDP: 2000,
            attackerDeleted: false,
            securityDigimonDeleted: true,
          },
        },
      ],
      () => {
        own.securityCount--;
        own.trash.push(looseCard("BT26-009", "visual-protection-security", 0));
      },
    );
  } else if (mechanism === "respawn") {
    incoming();
    const returnCards =
      keyword === "Fortitude"
        ? [actor.topCard!]
        : actor.stack
            .filter((source) => getCardDefinition(source.cardId)?.level === 4)
            .slice(0, keyword === "Partition" ? 2 : 1);
    stage(
      2200,
      "Exclusão do Digimon",
      "Digimon deletion",
      [
        {
          kind: "combatResolved",
          seat: 1,
          attackerPermanentId: defender.permanentId,
          deletedPermanentIds: [actor.permanentId],
        },
      ],
      () => {
        own.battleArea.splice(own.battleArea.indexOf(actor), 1);
        own.trash.push(actor.topCard!, ...actor.stack, ...actor.linked);
      },
    );
    stage(
      4300,
      "Retorno ao campo",
      "Returning to the field",
      returnCards.map((source, index) => ({
        kind: "cardPlayed",
        seat: 0,
        cardId: source.cardId,
        permanentId: keyword === "Fortitude" ? actor.permanentId : `visual-return-${index}`,
      })),
      () => {
        for (const [index, source] of returnCards.entries()) {
          own.trash.splice(
            own.trash.findIndex((card) => card.instanceId === source.instanceId),
            1,
          );
          if (keyword === "Fortitude") {
            actor.topCard = source;
            actor.stack.splice(0, actor.stack.length);
            actor.linked.splice(0, actor.linked.length);
            actor.isSuspended = true;
            own.battleArea.push(actor);
          } else {
            const returned = {
              ...actor,
              permanentId: `visual-return-${index}`,
              topCard: source,
              stack: [],
              linked: [],
              keywords: [],
              grantedKeywords: [],
              isSuspended: false,
              baseDP: getCardDefinition(source.cardId)?.dp ?? 0,
              currentDP: getCardDefinition(source.cardId)?.dp ?? 0,
            } as unknown as Permanent;
            own.battleArea.push(returned);
          }
        }
      },
    );
  } else if (mechanism === "retaliation") {
    incoming();
    endIncoming(2200, [actor, defender]);
  } else if (mechanism === "ice" || mechanism === "succession") {
    incoming();
    endIncoming(2200, [defender]);
  } else if (mechanism === "fragment") {
    incoming();
    const paid = actor.stack.at(-1)!;
    stage(
      1600,
      "Fonte paga para evitar exclusão",
      "Source paid to avoid deletion",
      [
        {
          kind: "cardsMoved",
          seat: 0,
          instanceIds: [paid.instanceId],
          cardIds: [paid.cardId],
          from: "digivolutionCards",
          to: "trash",
        },
      ],
      () => {
        actor.stack.pop();
        own.trash.push(paid);
      },
    );
    endIncoming(3000);
  } else if (mechanism === "progress") {
    declaration("field");
    stage(
      1600,
      "Efeito do oponente durante Progress",
      "Opponent effect during Progress",
      [
        {
          kind: "cardsMoved",
          seat: 1,
          instanceIds: ["visual-progress-discard"],
          cardIds: ["BT26-079"],
          from: "hand",
          to: "trash",
        },
        {
          kind: "effectTriggered",
          seat: 1,
          sourceCardId: defender.topCard!.cardId,
          effectKey: "visual/plutomon-all-turns",
          timing: "AllTurns",
          description: "Opponent deletion effect threatens lowest-level Digimon; the Progress attacker remains.",
        },
        ...(ally
          ? [
              {
                kind: "cardsMoved" as const,
                seat: 0 as const,
                instanceIds: [ally.topCard!.instanceId],
                cardIds: [ally.topCard!.cardId],
                from: "battleArea",
                to: "trash",
              },
            ]
          : []),
      ],
      () => {
        opp.handCount = Math.max(0, opp.handCount - 1);
        opp.trash.push(looseCard("BT26-079", "visual-progress-discard", 1));
        if (ally) {
          own.battleArea.splice(own.battleArea.indexOf(ally), 1);
          own.trash.push(ally.topCard!, ...ally.stack);
        }
      },
    );
    clash(3700);
  } else if (mechanism === "option" && optionCard && optionPiece) {
    if (keyword === "Delay") {
      stage(
        600,
        "Consumo da opção Delay",
        "Consuming the Delay Option",
        [
          {
            kind: "cardsMoved",
            seat: 0,
            instanceIds: [optionCard.instanceId],
            cardIds: [optionCard.cardId],
            from: "battleArea",
            to: "trash",
          },
        ],
        () => {
          own.battleArea.splice(own.battleArea.indexOf(optionPiece), 1);
          own.trash.push(optionCard);
        },
      );
      const from = state.memory;
      stage(
        2200,
        "Ganho de duas memórias",
        "Gaining two memory",
        [{ kind: "memoryChanged", from, to: from + 2, reason: "Blazing Memory Boost! Delay" }],
        () => {
          state.memory = from + 2;
        },
      );
    } else {
      stage(
        600,
        "Entrada de uma opção com Use Req.",
        "Playing an Option with Use Req.",
        [{ kind: "cardPlayed", seat: 0, cardId: optionCard.cardId, permanentId: optionPiece.permanentId }],
        () => {
          own.hand.splice(own.hand.indexOf(optionCard), 1);
          own.handCount--;
          own.battleArea.push(optionPiece);
        },
      );
      const lowest = opp.battleArea.filter(isDigimon).sort((left, right) => left.currentDP - right.currentDP)[0]!;
      stage(
        3000,
        "Efeito principal da opção",
        "Option Main effect",
        [
          {
            kind: "effectActivated",
            seat: 0,
            sourceCardId: optionCard.cardId,
            effectKey: "visual/ignition-flare",
            description: "Delete the opponent's lowest-DP Digimon.",
          },
          {
            kind: "cardsMoved",
            seat: 1,
            instanceIds: [lowest.topCard!.instanceId],
            cardIds: [lowest.topCard!.cardId],
            from: "battleArea",
            to: "trash",
          },
        ],
        () => {
          opp.battleArea.splice(opp.battleArea.indexOf(lowest), 1);
          opp.trash.push(lowest.topCard!, ...lowest.stack);
        },
      );
    }
  } else if (mechanism === "attack" || mechanism === "piercing" || mechanism === "alliance") {
    declaration("field");
    if (mechanism === "alliance" && ally)
      stage(1000, "Aliado e ganho de DP", "Ally and DP gain", [], () => {
        ally.isSuspended = true;
        actor.currentDP += ally.currentDP;
      });
    clash();
    if (mechanism === "piercing") security(4000);
  } else if (mechanism === "block") {
    if (keyword === "Blocker") {
      stage(
        600,
        "Ataque do oponente",
        "Opponent attack",
        [
          {
            kind: "attackDeclared",
            seat: 1,
            attackerPermanentId: defender.permanentId,
            attackerCardId: defender.topCard!.cardId,
            target: { kind: "player" },
          },
        ],
        () => {
          defender.isSuspended = true;
        },
      );
      stage(
        1800,
        "Seu Digimon bloqueia",
        "Your Digimon blocks",
        [{ kind: "blocked", blockerPermanentId: actor.permanentId }],
        () => {
          actor.isSuspended = true;
        },
      );
      stage(
        2500,
        "Confronto após bloqueio",
        "Clash after blocking",
        [
          {
            kind: "combatResolved",
            seat: 1,
            attackerPermanentId: defender.permanentId,
            deletedPermanentIds: [defender.permanentId],
          },
        ],
        () => {
          opp.battleArea.splice(opp.battleArea.indexOf(defender), 1);
          opp.trash.push(defender.topCard!, ...defender.stack);
        },
      );
    } else {
      declaration("security");
      stage(
        1800,
        "Interceptação do bloqueador",
        "Blocker interception",
        [{ kind: "blocked", blockerPermanentId: defender.permanentId }],
        () => {
          defender.isSuspended = true;
        },
      );
      clash(2500);
    }
  } else if (mechanism === "security") {
    declaration("security");
    security(1800);
    if (keyword === "SecurityAttack") security(4700);
  } else if (mechanism === "unsuspend") {
    stage(600, "Retorno da posição suspensa", "Unsuspending", [], () => {
      actor.isSuspended = false;
    });
  } else if (mechanism === "evolve") {
    stage(
      600,
      "Digievolução",
      "Digivolution",
      [
        {
          kind: "digivolved",
          seat: 0,
          permanentId: actor.permanentId,
          cardId: "BT26-016",
          mechanic: keyword.startsWith("Blast") ? "blast" : "normal",
        },
      ],
      () => {
        actor.stack.push(actor.topCard!);
        actor.topCard = looseCard("BT26-016", "visual-evolve-after", 0);
      },
    );
  } else if (mechanism === "draw") {
    stage(600, "Compra de carta", "Drawing a card", [], () => {
      if (own.deckCount > 0) {
        own.deckCount--;
        own.handCount++;
        own.hand.push(looseCard("BT26-009", "visual-draw", 0));
      }
    });
  } else if (mechanism === "recovery") {
    stage(
      600,
      "Recuperação de segurança",
      "Security recovery",
      [{ kind: "securityRecovered", seat: 0, amount: 1 }],
      () => {
        if (own.deckCount > 0) {
          own.deckCount--;
          own.securityCount++;
          own.security.push({ ...looseCard("BT26-009", "visual-recovery", 0), faceUp: false } as CardInstance);
        }
      },
    );
  } else if (mechanism === "memory") {
    const from = state.memory;
    stage(
      600,
      "Mudança de memória",
      "Memory change",
      [{ kind: "memoryChanged", from, to: from + 1, reason: "Visual preview of reduced cost" }],
      () => {
        state.memory = from + 1;
      },
    );
  }
  return {
    initialState,
    stages,
    keywordLabels,
    durationMs:
      mechanism === "respawn" || keyword === "Save" || keyword === "MaterialSave"
        ? 10000
        : mechanism === "zone" || keyword === "SecurityAttack" || mechanism === "piercing"
          ? 8500
          : 6500,
  };
}
