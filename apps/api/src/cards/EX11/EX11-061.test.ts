import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-061.js";
import "../BT13/BT13-099.js";

describe("EX11-061 Mirai Kinosaki", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-061")).toMatchObject({
      nameEn: "Mirai Kinosaki",
      colors: ["Yellow", "Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains memory at the start of the main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-061", as: "mirai" }], deck: ["BT1-009", "BT1-013", "BT1-019"] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }], deck: ["BT1-009", "BT1-013", "BT1-019"] },
    });
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays a level 3 Puppet after a Puppet digivolution and deletes exactly it at turn end (Q5915/Q5916)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-061", as: "mirai" },
            { card: "EX11-019", as: "base" },
          ],
          hand: [
            { card: "EX11-021", as: "digivolveTarget" },
            { card: "EX11-020", as: "playedByMirai" },
          ],
          deck: ["AD1-001", "BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("digivolveTarget").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-020"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX11-020");
    expect(played).toBeDefined();
    expect(s.perm("mirai").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-021");

    // DelayedDelete joins the real turn-end processing window.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-020")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it.each(["other-end-effect-first", "mirai-delete-first"] as const)(
    "orders competing turn-end processing (%s) and deletes only Mirai's played Puppet",
    async (orderChoice) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX11-061", as: "mirai" },
              { card: "BT13-099", as: "otherEnd" },
              { card: "EX11-019", as: "base" },
            ],
            hand: [
              { card: "EX11-021", as: "digivolveTarget" },
              { card: "EX11-020", as: "playedByMirai" },
            ],
            deck: ["AD1-001", "BT1-009", "BT1-013"],
          },
          1: { deck: ["BT1-009", "BT1-013", "BT1-019"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("digivolveTarget").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-020"));

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.kind === "orderTriggers")!;
      const triggerCardIds = request.req.options?.triggerCardIds ?? [];
      expect(triggerCardIds).toEqual(expect.arrayContaining(["EX11-020", "BT13-099"]));
      const keys = request.req.options?.triggerKeys ?? [];
      const selectedIndex = triggerCardIds.findIndex((cardId) =>
        orderChoice === "other-end-effect-first" ? cardId === "BT13-099" : cardId === "EX11-020",
      );
      expect(selectedIndex).toBeGreaterThanOrEqual(0);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "orderTriggers", order: [keys[selectedIndex]!] },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.state.turnSeat === 1);

      expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX11-020")).toBe(true);
      expect(
        s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("otherEnd").permanentId),
      ).toBe(true);
      expect(s.perm("base").topCard.cardId).toBe("EX11-021");
      expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT13-099")).toBe(false);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      assertNoLoudGap(s);
    },
  );

  it("plays only the level 3 [Puppet] out of a mixed hand", async () => {
    // EX11-021 is a [Puppet] Digimon at the WRONG level and BT1-090 matches nothing; both are
    // listed before the legal card, so a broken level or trait bound would take one of them.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-061", as: "mirai" },
            { card: "EX11-020", as: "digivolvedPuppet" },
          ],
          hand: [
            { card: "EX11-021", as: "levelFourPuppet" },
            { card: "BT1-090", as: "unrelated" },
            { card: "EX11-020", as: "levelThreePuppet" },
          ],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("digivolvedPuppet").permanentId,
        instanceId: s.inst("levelFourPuppet").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mirai").isSuspended);

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090", "AD1-001"]);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX11-020")).toHaveLength(1);
    expect(s.perm("digivolvedPuppet").topCard.cardId).toBe("EX11-021");
    assertNoLoudGap(s);
  });

  it("declines the suspend cost, plays nothing, and arms no turn-end deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-061", as: "mirai" },
            { card: "EX11-020", as: "unrelatedPuppet" },
          ],
          hand: [
            { card: "EX11-021", as: "evolver" },
            { card: "EX11-020", as: "playedByMirai" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("unrelatedPuppet").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("mirai").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX11-021", "EX11-020"]);

    // The delayed delete only targets a Puppet this effect played; the existing Puppet survives.
    expect(s.perm("unrelatedPuppet").topCard?.cardId).toBe("EX11-020");
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-061", as: "mirai", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-061"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-061")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with the delayed delete inside the digivolve watcher", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] } },
            cost: { kind: "suspend" },
          },
          { kind: "DelayedDelete" },
        ],
      },
    ]);
  });
});
