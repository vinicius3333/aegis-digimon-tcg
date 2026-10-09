import { getCardDefinition, Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("issue #5326: actual turn recovers at zero security, then exchanges existing security on the second play", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-github5326-sistermon-zero-security", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const me = s.state.players[0]!;
    expect(me.security).toHaveLength(0);
    expect(s.state.memory).toBe(6);
    expect(me.deck[0]!.instanceId).toBe("dev-5326-recovery-first-0");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-5326-blanc-first" })).toEqual({ ok: true });
    await settle(() => me.security.length === 1 && s.state.pendingDecision === undefined);
    expect(me.security.map((card) => card.instanceId)).toEqual(["dev-5326-recovery-first-0"]);
    expect(me.security[0]!.faceUp).toBe(false);
    expect(me.hand.map((card) => card.instanceId)).toEqual(["dev-5326-blanc-second", "dev-5326-draw-0"]);
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-5326-blanc-second" })).toEqual({ ok: true });
    await settle(
      () => me.security[0]?.instanceId === "dev-5326-recovery-second-0" && s.state.pendingDecision === undefined,
    );
    expect(me.security).toHaveLength(1);
    expect(me.security[0]!.faceUp).toBe(false);
    expect(me.hand.map((card) => card.instanceId)).toEqual(["dev-5326-draw-0", "dev-5326-recovery-first-0"]);
    expect(me.deck).toHaveLength(10);
    expect(me.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      "dev-5326-blanc-first",
      "dev-5326-blanc-second",
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.decisions).toHaveLength(0);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});

it.each(["BT20-032", "BT23-031", "BT25-036", "ST23-03", "BT26-022", "BT26-041"])(
  "issue #5326 sweep: %s continues to mandatory recovery with zero security",
  async (cardId) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }],
          deck: [{ card: "BT1-010", as: "recovery" }, "BT1-011"],
          security: [],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const recoveryId = s.inst("recovery").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.events.some(
        (event) =>
          (event.kind === "effectResolved" || event.kind === "effectHadNoEffect") && event.sourceCardId === cardId,
      ),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([recoveryId]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(10 - getCardDefinition(cardId)!.playCost!);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  },
);

it("issue #5326 negative sweep control: Zoe does not recover when no security card was added", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT7-088", as: "zoe" }],
        deck: [{ card: "BT1-010", as: "deckTop" }],
        security: [],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  await s.ready();
  const deckTopId = s.inst("deckTop").instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zoe").instanceId })).toEqual({ ok: true });
  await settle(() =>
    s.events.some(
      (event) =>
        (event.kind === "effectResolved" || event.kind === "effectHadNoEffect") && event.sourceCardId === "BT7-088",
    ),
  );
  expect(s.state.players[0]!.security).toHaveLength(0);
  expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([deckTopId]);
  expect(s.state.memory).toBe(0);
  expect(s.state.pendingDecision).toBeUndefined();
  assertNoLoudGap(s);
});
