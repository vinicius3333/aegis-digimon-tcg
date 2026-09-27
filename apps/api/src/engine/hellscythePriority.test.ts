import { EffectTiming, Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";

function reactionOrder(s: EngineSetup) {
  return s.events.flatMap((e) =>
    e.kind === "effectTriggered" && ["BT1-060", "BT2-070", "BT15-036"].includes(e.sourceCardId) ? [e.sourceCardId] : [],
  );
}

it.each([0, 1] as const)(
  "gives turn seat %s MagnaAngemon priority over the opponent's Tapirmon deletion",
  async (seat: Seat) => {
    const opponent = seat === 0 ? 1 : 0;
    const s = setupEngine(
      {
        [seat]: {
          battleArea: ["BT8-041"],
          hand: [{ card: "BT8-109", as: "option" }],
          trash: ["BT1-060"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        [opponent]: { battleArea: [{ card: "BT2-070", as: "victim" }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = seat;
    s.state.memory = 8;
    expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(reactionOrder(s)).toEqual(["BT1-060", "BT2-070"]);
    expect(s.state.players[seat]!.security).toHaveLength(2);
    expect(s.state.players[opponent]!.hand).toHaveLength(1);
  },
);

it("still resolves deletion when the optional revival is declined", async () => {
  const s = setupEngine(
    {
      0: { battleArea: ["BT8-041"], hand: [{ card: "BT8-109", as: "option" }], trash: ["BT1-060"] },
      1: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"] },
    },
    { autoSelectCards: true, autoDeclineOptional: true },
  );
  s.state.memory = 8;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle();
  expect(reactionOrder(s)).toEqual(["BT2-070"]);
  expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT1-060")).toBe(true);
  expect(s.state.players[1]!.hand).toHaveLength(1);
});

it("runs the reported Wizardmon/MagnaAngemon arena with recovery before the opponent's deletion effect", async () => {
  const automation = {
    autoSelectCards: true,
    autoAcceptOptional: true,
    preferOptionIndex: 0,
    preferInstanceIds: [] as string[],
  };
  const s = setupEngine({ 0: {}, 1: {} }, automation);
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario("arena-hellscythe-onplay-priority");
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const option = human.hand.find((c) => c.cardId === "BT8-109")!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle();
    expect(reactionOrder(s)).toEqual(["BT1-060", "BT15-036"]);
    expect(human.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(human.trash.some((c) => c.cardId === "BT8-109")).toBe(true);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});

it("keeps the attacking turn player's deletion ahead of the defender's recovery when Hellscythe activates in security", async () => {
  const s = setupEngine(
    {
      0: { battleArea: ["BT2-070"], deck: ["BT1-009", "BT1-009"] },
      1: {
        security: [{ card: "BT8-109", as: "option", faceUp: true }],
        trash: ["BT1-060"],
        deck: ["BT1-009", "BT1-009"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  await settle();
  expect(reactionOrder(s)).toEqual(["BT2-070", "BT1-060"]);
  expect(s.state.players[0]!.hand).toHaveLength(1);
  expect(s.state.players[1]!.security).toHaveLength(2);
});
