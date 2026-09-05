import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-051.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT11/BT11-061.js";
import "../index.js";

describe("EX9-051", () => {
  it("does not expose or accept an ordinary Main ability in breeding alongside the Training exception", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-061", as: "field" }],
        breeding: { card: "BT11-061", as: "raising" },
        deck: ["BT1-010", "BT1-048", "BT1-046"],
      },
    });
    await s.ready();
    const ability = observe(s.engine).activatableEffects(s.perm("field"))[0];
    expect(ability).toBeDefined();
    expect(observe(s.engine).activatableEffects(s.perm("raising"))).toEqual([]);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("raising").topCard.instanceId,
        effectKey: ability!.effectKey,
      }).ok,
    ).toBe(false);
    expect(s.perm("raising").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([false, true])(
    "uses Training to place the deck top face-down at the bottom (breeding=%s)",
    async (breeding) => {
      const s = setupEngine({
        0: {
          ...(breeding
            ? { breeding: { card: "EX9-051", as: "host", under: ["EX9-046"] } }
            : { battleArea: [{ card: "EX9-051", as: "host", under: ["EX9-046"] }] }),
          deck: ["BT1-010", "BT1-048"],
        },
      });
      await s.ready();
      const sourceInstanceId = s.perm("host").topCard.instanceId;
      const ability = observe(s.engine)
        .activatableEffects(s.perm("host"))
        .find((entry) => entry.instanceId === sourceInstanceId);
      expect(ability).toBeDefined();
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: ability!.effectKey }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").isSuspended).toBe(true);
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-010", "EX9-046"]);
      expect(s.perm("host").stack[0]!.faceUp).toBe(false);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048"]);
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: ability!.effectKey }).ok,
      ).toBe(false);
      expect(s.state.players[0]!.deck).toHaveLength(1);
    },
  );

  it.each([false, true])(
    "can activate Training again after unsuspending in the same turn (breeding=%s)",
    async (breeding) => {
      const s = setupEngine({
        0: {
          ...(breeding
            ? { breeding: { card: "EX9-051", as: "host", under: ["EX9-046"] } }
            : { battleArea: [{ card: "EX9-051", as: "host", under: ["EX9-046"] }] }),
          deck: ["BT1-010", "BT1-048"],
        },
      });
      await s.ready();
      const source = s.perm("host");
      const sourceInstanceId = source.topCard.instanceId;
      const ability = observe(s.engine)
        .activatableEffects(source)
        .find((entry) => entry.instanceId === sourceInstanceId);
      expect(ability).toBeDefined();

      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: ability!.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => source.stack.length === 2 && s.state.players[0]!.deck.length === 1);
      expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-010", "EX9-046"]);

      await advance(s.engine).verb.unsuspend([source.permanentId]);
      expect(source.isSuspended).toBe(false);
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: ability!.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => source.stack.length === 3 && s.state.players[0]!.deck.length === 0);

      expect(source.isSuspended).toBe(true);
      expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-010", "EX9-046"]);
      expect(source.stack[0]!.faceUp).toBe(false);
      expect(source.stack[1]!.faceUp).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each(["EX9-008", "BT1-009"])("enforces the off-color level-three DM route for %s", async (base) => {
    const legal = base === "EX9-008";
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-051", as: "evo" }], deck: ["BT1-010"] },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-051" : base);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(legal ? [base] : []);
    expect(s.state.memory).toBe(legal ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("has Training and de-digivolves an opposing Digimon by one on play and attack after placing a hand card underneath", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords,
    ).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "DeDigivolve", amount: 1, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } },
        ],
      });
  });
  it("uses the same optional hand-payment contract for both triggers", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: 1,
        cost: {
          target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          faceDown: true,
        },
      });
  });
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("places a hand card face-down underneath and de-digivolves an opposing Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-051", as: "play" }, "BT1-010"] },
        1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play").instanceId })).toEqual({ ok: true });
    await settle();

    const source = s.state.players[0]!.battleArea[0]!;
    expect(source.topCard.cardId).toBe("EX9-051");
    expect(source.stack).toHaveLength(1);
    expect(source.stack[0]?.cardId).toBe("BT1-010");
    expect(source.stack[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-016");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("pays or explicitly declines the attack cost (accept=%s)", async (accept) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-051", as: "source", under: ["EX9-046"] }], hand: ["BT1-010"] },
        1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009"] }], security: ["BT1-048"] },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(accept ? ["BT1-010", "EX9-046"] : ["EX9-046"]);
    expect(s.perm("source").stack[0]!.faceUp).toBe(!accept);
    expect(s.state.players[0]!.hand).toHaveLength(accept ? 0 : 1);
    expect(s.perm("target").topCard.cardId).toBe(accept ? "BT1-009" : "BT1-016");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot de-digivolve without the hand placement cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-051", as: "play" }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.perm("target").topCard.cardId).toBe("BT1-016");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("explicitly declines the payable On Play cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-051", as: "source" }, "BT1-010"] },
        1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-051");
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.perm("target").topCard.cardId).toBe("BT1-016");
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits Blocker on a legal black level-five host and intercepts a real attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-063", as: "host", under: ["EX9-051"] }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
