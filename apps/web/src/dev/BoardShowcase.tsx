/* Dev-only gallery of the match screen's presentational pieces, rendered from
   fixtures instead of a live Colyseus room so a styling change can be reviewed
   without playing a match. Reached at /dev/board; each section carries a stable
   id that tools/ui-review.mjs screenshots one by one. */

import type { ReactNode } from "react";
import { CardInstance, Permanent, type DecisionRequest, type Seat } from "@aegis/shared";
import { AttackArrow, BreedingSlot, Hand, MemoryGauge, PermanentView, Pile, type HandEntry } from "../game/boardPieces";
import { BlockOverlay, DecisionOverlay, GameOverOverlay, MulliganOverlay } from "../game/overlays";
import { NoticeStack } from "../game/NoticeStack";
import { SidePanelStack } from "../game/SidePanelStack";
import type { MatchNotice } from "../game/notices";
import type { SidePanel } from "../game/sidePanels";
import type { TranslationKey } from "../i18n";
import "../game/game.css";
import "./boardShowcase.css";

/* ---------------- fixtures ---------------- */

const CARDS = {
  egg: "ST1-01",
  rookie: "ST1-03",
  champion: "ST1-07",
  ultimate: "ST1-09",
  mega: "ST1-11",
  tamer: "BT1-085",
  option: "BT1-090",
  opponentChampion: "ST2-06",
  opponentUltimate: "ST2-08",
} as const;

function cardInstance(instanceId: string, cardId: string, ownerSeat: Seat = 0): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  instance.ownerSeat = ownerSeat;
  return instance;
}

function permanent({
  permanentId,
  cardId,
  baseDP,
  currentDP,
  seat = 0,
  suspended = false,
  stackCardIds = [],
  grantedKeywords = [],
}: {
  permanentId: string;
  cardId: string;
  baseDP: number;
  currentDP?: number;
  seat?: Seat;
  suspended?: boolean;
  stackCardIds?: readonly string[];
  grantedKeywords?: readonly string[];
}): Permanent {
  const perm = new Permanent();
  perm.permanentId = permanentId;
  perm.controllerSeat = seat;
  perm.topCard = cardInstance(`${permanentId}-top`, cardId, seat);
  perm.baseDP = baseDP;
  perm.currentDP = currentDP ?? baseDP;
  perm.isSuspended = suspended;
  perm.stack.push(...stackCardIds.map((id, index) => cardInstance(`${permanentId}-under-${index}`, id, seat)));
  perm.grantedKeywords.push(...grantedKeywords);
  return perm;
}

function handEntry({
  index,
  cardId,
  playable = false,
  digivolveTargets = [],
}: {
  index: number;
  cardId: string;
  playable?: boolean;
  digivolveTargets?: readonly string[];
}): HandEntry {
  return {
    instanceId: `hand-${index}`,
    cardId,
    activatableEffectsJson: "",
    playableFromHand: playable,
    digivolveTargetPermanentIds: [...digivolveTargets],
  };
}

const MIXED_HAND: HandEntry[] = [
  handEntry({ index: 0, cardId: CARDS.rookie, playable: true }),
  handEntry({ index: 1, cardId: CARDS.champion }),
  handEntry({ index: 2, cardId: CARDS.tamer, playable: true }),
  handEntry({ index: 3, cardId: CARDS.option }),
  handEntry({ index: 4, cardId: CARDS.ultimate, digivolveTargets: ["p-you-1"] }),
];

const LARGE_HAND: HandEntry[] = Array.from({ length: 10 }, (_, index) =>
  handEntry({
    index,
    cardId: Object.values(CARDS)[index % Object.values(CARDS).length]!,
    playable: index % 3 === 0,
  }),
);

const TARGET_DECISION: DecisionRequest = {
  decisionId: "showcase-decision",
  seat: 0,
  kind: "chooseTargets",
  promptText: "Delete 1 of your opponent's Digimon with 5000 DP or less.",
  sourceCardId: CARDS.option,
  options: {
    candidateInstanceIds: ["opp-1", "opp-2"],
    min: 1,
    max: 1,
    timing: "Main",
    effectText: "[Main] Delete 1 of your opponent's Digimon with 5000 DP or less.",
  },
};

const noop = () => {};

/* Panels and notices read their clocks from a `nowMs` the caller supplies, so
   pinning it here freezes every eroding border mid-sweep for a screenshot. */
const SHOWCASE_NOW = 1_000;

function showcasePanel({
  id,
  titleKey,
  side = "you",
  cardIds,
  ordered = false,
  age = 0,
}: {
  id: string;
  titleKey: TranslationKey;
  side?: SidePanel["side"];
  cardIds: readonly string[];
  ordered?: boolean;
  age?: number;
}): SidePanel {
  return {
    id,
    titleKey,
    side,
    cards: cardIds.map((cardId, index) => ({ cardId, badge: index + 1 })),
    ordered,
    createdAt: SHOWCASE_NOW - age,
  };
}

const PANEL_CASES: { label: string; panels: SidePanel[] }[] = [
  {
    label: "Discarded cards (viewer)",
    panels: [showcasePanel({ id: "discard", titleKey: "panel.discardedCards", cardIds: [CARDS.rookie, CARDS.option] })],
  },
  {
    label: "Cards added to hand (viewer)",
    panels: [showcasePanel({ id: "hand", titleKey: "panel.cardsAddedToHand", cardIds: [CARDS.champion] })],
  },
  {
    label: "Selected Cards (viewer)",
    panels: [
      showcasePanel({
        id: "selected",
        titleKey: "panel.selectedCards",
        cardIds: [CARDS.tamer, CARDS.mega],
        ordered: true,
      }),
    ],
  },
  {
    label: "Revealed Cards (opponent, numbered)",
    panels: [
      showcasePanel({
        id: "revealed",
        titleKey: "panel.revealedCards",
        side: "opp",
        cardIds: [CARDS.opponentChampion, CARDS.opponentUltimate, CARDS.egg],
        ordered: true,
      }),
    ],
  },
  {
    label: "Deleted cards (opponent)",
    panels: [
      showcasePanel({
        id: "deleted",
        titleKey: "panel.deletedCards",
        side: "opp",
        cardIds: [CARDS.opponentUltimate],
      }),
    ],
  },
  {
    label: "Played Card (opponent)",
    panels: [
      showcasePanel({ id: "played", titleKey: "panel.playedCard", side: "opp", cardIds: [CARDS.opponentChampion] }),
    ],
  },
  {
    label: "Deck Bottom Card (viewer)",
    panels: [showcasePanel({ id: "deck-bottom", titleKey: "panel.deckBottomCard", cardIds: [CARDS.ultimate] })],
  },
  {
    label: "Digivolution Cards (opponent)",
    panels: [
      showcasePanel({
        id: "digivolution",
        titleKey: "panel.digivolutionCards",
        side: "opp",
        cardIds: [CARDS.egg, CARDS.rookie, CARDS.champion],
        ordered: true,
      }),
    ],
  },
  {
    label: "both columns, crowded (borders erode faster)",
    panels: [
      showcasePanel({ id: "crowd-1", titleKey: "panel.revealedCards", side: "opp", cardIds: [CARDS.opponentChampion] }),
      showcasePanel({
        id: "crowd-2",
        titleKey: "panel.playedCard",
        side: "opp",
        cardIds: [CARDS.opponentUltimate],
        age: 600,
      }),
      showcasePanel({ id: "crowd-3", titleKey: "panel.discardedCards", cardIds: [CARDS.rookie] }),
      showcasePanel({ id: "crowd-4", titleKey: "panel.deletedCards", cardIds: [CARDS.champion], age: 900 }),
    ],
  },
];

function showcaseNotice(id: string, body: MatchNotice["body"], overrides: Partial<MatchNotice> = {}): MatchNotice {
  return { id, side: "you", fromSecurity: false, body, createdAt: SHOWCASE_NOW, ...overrides };
}

const NOTICE_CASES: { label: string; notices: MatchNotice[] }[] = [
  {
    label: "viewer's effect (bottom-left)",
    notices: [
      showcaseNotice("effect-you", {
        variant: "effect",
        cardId: CARDS.option,
        timing: "Main",
        description: "Delete 1 of your opponent's Digimon with 5000 DP or less.",
      }),
    ],
  },
  {
    label: "opponent's effect (top-left)",
    notices: [
      showcaseNotice(
        "effect-opp",
        {
          variant: "effect",
          cardId: CARDS.opponentUltimate,
          timing: "WhenDigivolving",
          description: "Draw 1 card.",
        },
        { side: "opp" },
      ),
    ],
  },
  {
    label: "security effect (mirrored to the middle)",
    notices: [
      showcaseNotice(
        "effect-security",
        {
          variant: "effect",
          cardId: CARDS.mega,
          timing: "Security",
          description: "Play this card without paying its memory cost.",
        },
        { fromSecurity: true },
      ),
    ],
  },
  {
    label: "recovery and refusal",
    notices: [
      showcaseNotice("recovery", { variant: "recovery", amount: 2 }),
      showcaseNotice("rejection", { variant: "rejection", reason: "It is not your turn." }),
    ],
  },
  {
    label: "three stacked (disperse faster)",
    notices: [
      showcaseNotice("stack-1", {
        variant: "effect",
        cardId: CARDS.rookie,
        timing: "OnPlay",
        description: "Draw 1 card.",
      }),
      showcaseNotice("stack-2", { variant: "recovery", amount: 1 }),
      showcaseNotice(
        "stack-3",
        { variant: "effect", cardId: CARDS.opponentChampion, timing: "OnDeletion", description: "Gain 1 memory." },
        { side: "opp" },
      ),
    ],
  },
];

/* ---------------- scaffolding ---------------- */

function Section({
  id,
  title,
  note,
  stacked,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  stacked?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="board-showcase__section" aria-label={title}>
      <h2 className="board-showcase__section-title">{title}</h2>
      {note ? <p className="board-showcase__section-note">{note}</p> : null}
      <div className={`board-showcase__row${stacked ? " board-showcase__row--stacked" : ""}`}>{children}</div>
    </section>
  );
}

function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="board-showcase__case">
      {children}
      <span className="board-showcase__case-label">{label}</span>
    </div>
  );
}

function Stage({ label, height, children }: { label: string; height: number; children: ReactNode }) {
  return (
    <Case label={label}>
      <div className="board-showcase__stage" style={{ height }}>
        {children}
      </div>
    </Case>
  );
}

/* ---------------- page ---------------- */

export function BoardShowcase() {
  return (
    <main className="game-layout board-showcase">
      <header className="board-showcase__intro">
        <h1 className="board-showcase__title">Board showcase</h1>
        <p className="board-showcase__lead">
          Every match-screen piece rendered from fixtures. Nothing here talks to a room, so a styling change can be
          reviewed by scrolling. Screenshot it with <code>node tools/ui-review.mjs</code>.
        </p>
      </header>

      <Section
        id="showcase-memory-gauge"
        title="memory gauge"
        note="Hex gauge with the lit marker, plus the end-turn orb that rides the band's right edge."
        stacked
      >
        {[-10, -3, 0, 3, 10].map((value) => (
          <Case key={value} label={`memory ${value > 0 ? `+${value}` : value}`}>
            <div className="game-memory-band" style={{ position: "relative" }}>
              <MemoryGauge value={value} phaseLabel="Main" />
              <button className={`game-end-turn-orb${value < 0 ? " game-end-turn-orb--waiting" : ""}`}>
                {value < 0 ? "Opponent's turn" : "End turn"}
              </button>
            </div>
          </Case>
        ))}
        <Case label="compact (narrow viewport)">
          <div className="game-memory-band" style={{ position: "relative" }}>
            <MemoryGauge value={3} compact phaseLabel="Main" />
          </div>
        </Case>
      </Section>

      <Section
        id="showcase-hand"
        title="hand"
        note="Playable cards carry the cyan glow the server projection drives; the selected card lifts out of the fan."
        stacked
      >
        <Case label="mixed: playable, not playable, digivolve target">
          <Hand cards={MIXED_HAND} startDrag={noop} selectCard={noop} />
        </Case>
        <Case label="selected card">
          <Hand cards={MIXED_HAND} selectedInstanceId="hand-2" startDrag={noop} selectCard={noop} />
        </Case>
        <Case label="ten cards (fan tightens)">
          <Hand cards={LARGE_HAND} startDrag={noop} selectCard={noop} />
        </Case>
      </Section>

      <Section
        id="showcase-permanents"
        title="permanents"
        note="Digivolution stack depth, DP delta badge, granted keywords, suspension and the attack-candidate glow."
      >
        <Case label="plain">
          <PermanentView perm={permanent({ permanentId: "p-plain", cardId: CARDS.champion, baseDP: 4000 })} />
        </Case>
        <Case label="suspended">
          <PermanentView
            perm={permanent({ permanentId: "p-susp", cardId: CARDS.champion, baseDP: 4000, suspended: true })}
          />
        </Case>
        <Case label="DP gain">
          <PermanentView
            perm={permanent({ permanentId: "p-up", cardId: CARDS.ultimate, baseDP: 7000, currentDP: 10000 })}
          />
        </Case>
        <Case label="DP loss">
          <PermanentView
            perm={permanent({ permanentId: "p-down", cardId: CARDS.ultimate, baseDP: 7000, currentDP: 4000 })}
          />
        </Case>
        <Case label="digivolution stack">
          <PermanentView
            perm={permanent({
              permanentId: "p-stack",
              cardId: CARDS.mega,
              baseDP: 12000,
              stackCardIds: [CARDS.egg, CARDS.rookie, CARDS.champion],
            })}
          />
        </Case>
        <Case label="granted keywords">
          <PermanentView
            perm={permanent({
              permanentId: "p-keywords",
              cardId: CARDS.mega,
              baseDP: 12000,
              grantedKeywords: ["Blocker", "Rush", "Piercing", "Security Attack +1"],
            })}
          />
        </Case>
        <Case label="attack candidate">
          <PermanentView
            perm={permanent({ permanentId: "p-cand", cardId: CARDS.opponentChampion, baseDP: 4000, seat: 1 })}
            candidate
          />
        </Case>
        <Case label="selected (highlight)">
          <PermanentView
            perm={permanent({ permanentId: "p-sel", cardId: CARDS.champion, baseDP: 4000 })}
            highlight
            onClick={noop}
          />
        </Case>
        <Case label="dimmed (illegal target)">
          <PermanentView perm={permanent({ permanentId: "p-dim", cardId: CARDS.champion, baseDP: 4000 })} dimmed />
        </Case>
      </Section>

      <Section id="showcase-breeding" title="breeding slot" note="Empty, occupied, and lit as a hatch/move candidate.">
        <Case label="empty">
          <BreedingSlot label="Breeding" />
        </Case>
        <Case label="occupied">
          <BreedingSlot label="Breeding" perm={permanent({ permanentId: "p-egg", cardId: CARDS.egg, baseDP: 0 })} />
        </Case>
        <Case label="candidate">
          <BreedingSlot label="Breeding" candidate />
        </Case>
        <Case label="compact">
          <BreedingSlot
            label="Breeding"
            compact
            perm={permanent({ permanentId: "p-egg-compact", cardId: CARDS.egg, baseDP: 0 })}
          />
        </Case>
      </Section>

      <Section
        id="showcase-security"
        title="security shields and piles"
        note="Shields are red for the viewer and blue for the opponent; the glow marks an attackable stack."
      >
        <Case label="yours">
          <Pile count={5} label="Security" shield="you" />
        </Case>
        <Case label="opponent">
          <Pile count={3} label="Security" shield="opp" />
        </Case>
        <Case label="opponent, attackable">
          <Pile count={3} label="Security" shield="opp" glow onClick={noop} />
        </Case>
        <Case label="empty">
          <Pile count={0} label="Security" shield="you" dim />
        </Case>
        <Case label="deck pile">
          <Pile count={40} label="Deck" />
        </Case>
        <Case label="trash pile (top card)">
          <Pile count={7} label="Trash" topCardId={CARDS.option} onClick={noop} />
        </Case>
        <Case label="deck pile, compact">
          <Pile count={12} label="Egg" compact />
        </Case>
      </Section>

      <Section
        id="showcase-turn-banner"
        title="turn banner"
        note="Held still here; in a match it wipes across and fades."
      >
        <Stage label="your turn" height={180}>
          <div className="game-turn-banner game-turn-banner--you" style={{ animation: "none" }}>
            <span>Your turn</span>
          </div>
        </Stage>
        <Stage label="opponent's turn" height={180}>
          <div className="game-turn-banner game-turn-banner--opp" style={{ animation: "none" }}>
            <span>Opponent's turn</span>
          </div>
        </Stage>
      </Section>

      <Section id="showcase-attack-arc" title="attack arc" note="The arc the pointer drags from attacker to target.">
        <Stage label="short arc" height={220}>
          <AttackArrow from={{ x: 60, y: 190 }} to={{ x: 300, y: 40 }} />
        </Stage>
        <Stage label="long arc" height={220}>
          <AttackArrow from={{ x: 40, y: 200 }} to={{ x: 520, y: 30 }} />
        </Stage>
      </Section>

      <Section
        id="showcase-side-panels"
        title="timed side panels"
        note="Opponent-origin panels stack down from the top-right, the viewer's up from the bottom-right. The cyan ring around each panel erodes clockwise over the time it has left, and a crowded column erodes faster."
        stacked
      >
        {PANEL_CASES.map(({ label, panels }) => (
          <Stage key={label} label={label} height={560}>
            <SidePanelStack panels={panels} nowMs={SHOWCASE_NOW} onDismiss={noop} />
          </Stage>
        ))}
      </Section>

      <Section
        id="showcase-notices"
        title="notice stack"
        note="Corner-framed notices: the viewer's moments anchor bottom-left, the opponent's top-left, and anything a security card raised mirrors to the middle of the half the panels do not occupy."
        stacked
      >
        {NOTICE_CASES.map(({ label, notices }) => (
          <Stage key={label} label={label} height={460}>
            <NoticeStack notices={notices} nowMs={SHOWCASE_NOW} onDismiss={noop} />
          </Stage>
        ))}
      </Section>

      <Section
        id="showcase-dialogs"
        title="dialogs"
        note="Mulligan, block window, target decision and game over, each on its own framed stage."
        stacked
      >
        <Stage label="mulligan" height={560}>
          <MulliganOverlay
            handCardIds={[CARDS.rookie, CARDS.champion, CARDS.tamer, CARDS.option, CARDS.ultimate]}
            onKeep={noop}
            onMulligan={noop}
          />
        </Stage>
        <Stage label="block window" height={480}>
          <div className="game-modal" style={{ position: "absolute", inset: 0 }}>
            <BlockOverlay
              attackerCardId={CARDS.opponentUltimate}
              blockers={[
                { permanentId: "p-you-1", cardId: CARDS.champion, currentDP: 4000, sourceCount: 1 },
                { permanentId: "p-you-2", cardId: CARDS.ultimate, currentDP: 7000, sourceCount: 3 },
              ]}
              onBlock={noop}
              onDecline={noop}
            />
          </div>
        </Stage>
        <Stage label="target decision" height={560}>
          <div className="game-modal" style={{ position: "absolute", inset: 0 }}>
            <DecisionOverlay
              request={TARGET_DECISION}
              sourceCardId={CARDS.option}
              candidates={[
                { instanceId: "opp-1", cardId: CARDS.opponentChampion, selectable: true, currentDP: 4000 },
                {
                  instanceId: "opp-2",
                  cardId: CARDS.opponentUltimate,
                  selectable: false,
                  currentDP: 7000,
                  isSuspended: true,
                },
              ]}
              picks={["opp-1"]}
              onTogglePick={noop}
              onRespond={noop}
            />
          </div>
        </Stage>
        <Stage label="game over" height={560}>
          <GameOverOverlay
            result="win"
            reason="Opponent ran out of security."
            stats={[
              { value: 12, label: "Turns" },
              { value: 3, label: "Security left" },
              { value: "8:42", label: "Duration" },
            ]}
            onMenu={noop}
            onRematch={noop}
          />
        </Stage>
      </Section>
    </main>
  );
}
