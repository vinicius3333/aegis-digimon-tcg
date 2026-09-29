import "../EX4/EX4-074.js";
import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-096.js";

describe("BT13-096 Homer Yushima", () => {
  it("may play a blue level 3 Digimon from a digivolution card on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] }, count: 1 },
        },
      ],
    });
  });

  it("places a blue level 4 or lower Digimon from hand under the played Digimon", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("BT13-096 AllTurns watcher must be a SubTrigger");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "suspend",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        optional: true,
      },
      optional: true,
      abortOnDecline: true,
      actions: [
        {
          kind: "PlaceUnder",
          from: ["hand"],
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          underFilter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], isTriggerSource: true },
          position: "bottom",
          optional: true,
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("plays a blue level 3 from its digivolution cards on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-033", as: "blueHost", under: [{ card: "BT1-030", as: "gomamon" }] }],
          hand: [{ card: "BT13-096", as: "homer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("gomamon").instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("homer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sourceId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(sourceId);
    expect(s.perm("blueHost").stack.map((card) => card.instanceId)).not.toContain(sourceId);
  });

  it("naturally suspends Homer and places a blue level-4-or-lower card under the played source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: "BT1-027", as: "played-blue" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played-blue").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("homer").isSuspended && s.perm("played-blue").stack.length === 1);
    expect(s.perm("homer").isSuspended).toBe(true);
    expect(s.perm("played-blue").stack.at(-1)?.instanceId).toBe(s.inst("placed-blue").instanceId);
  });

  it("declining the optional suspend leaves the played source and hand card unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: "BT1-027", as: "played-blue" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played-blue").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("played-blue").instanceId,
      ),
    );
    expect(s.perm("homer").isSuspended).toBe(false);
    expect(s.perm("played-blue").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("placed-blue").instanceId)).toBe(true);
  });

  it("allows the suspend cost and nested placement may to be declined independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: "BT1-027", as: "played-blue" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played-blue").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const costDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const placementDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("homer").isSuspended);
    expect(s.perm("homer").isSuspended).toBe(true);
    expect(s.perm("played-blue").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("placed-blue").instanceId)).toBe(true);
  });
});

describe("BT13-096 Homer Yushima — KB Q&A rulings", () => {
  async function playIntoOpponentZeroDpAura(playedCard: string) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: playedCard, as: "played" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
        1: { battleArea: [{ card: "EX4-074", as: "ruinMode" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // ShineGreymon: Ruin Mode's -5000 DP to all of seat 0's Digimon, activated on the opponent's turn.
    s.state.turnSeat = 1;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("ruinMode"));
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === playedId));
    await drainMicrotasks();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === playedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === playedId)).toBe(false);
    return s;
  }

  function homerOptionalOffered(s: Awaited<ReturnType<typeof playIntoOpponentZeroDpAura>>): boolean {
    return s.decisions.some(({ seat, req }) => seat === 0 && req.kind === "optional");
  }

  it("still triggers [All Turns] when the played blue Digimon is deleted on play by an opponent's 0-DP effect (Q2342)", async () => {
    const blue = await playIntoOpponentZeroDpAura("BT1-027");
    expect(homerOptionalOffered(blue)).toBe(true);
    expect(blue.perm("homer").isSuspended).toBe(true);
    expect(blue.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT13-096")).toBe(
      true,
    );

    const red = await playIntoOpponentZeroDpAura("BT1-009");
    expect(homerOptionalOffered(red)).toBe(false);
    expect(red.perm("homer").isSuspended).toBe(false);
  });

  // Q2856/Q3523: rule processing removes the 0-DP Digimon before the triggered effect activates,
  // so Homer's placement has no Digimon to go under and the hand card stays in hand.
  it.fails("deletes the 0-DP played Digimon before Homer's effect resolves, leaving the hand card in hand", async () => {
    const blue = await playIntoOpponentZeroDpAura("BT1-027");
    expect(blue.perm("homer").isSuspended).toBe(true);
    const deletionIndex = blue.events.findIndex((event) => event.kind === "cardsMoved" && event.to === "trash");
    const homerResolvedIndex = blue.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT13-096",
    );
    expect(homerResolvedIndex).toBeGreaterThan(-1);
    expect(deletionIndex).toBeLessThan(homerResolvedIndex);
    expect(blue.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blue.inst("placed-blue").instanceId);
  });
});
