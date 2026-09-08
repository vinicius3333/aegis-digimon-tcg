import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_046 } from "./BT24-046.js";
import "../index.js";

describe("BT24-046 Garurumon", () => {
  it("matches the immutable catalog identity and evolution routes", () => {
    expect(getCardDefinition("BT24-046")).toMatchObject({
      cardId: "BT24-046",
      nameEn: "Garurumon",
      colors: ["Green", "Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "Iliad", "TS"],
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
    });
    expect(BT24_046.digivolutionRequirement).toEqual([
      { level: 3, names: ["Gabumon"], cost: 2, isAlternate: true },
      { traits: ["TS"], cost: 2, isAlternate: true, level: 3 },
    ]);
  });

  it("suspends one opposing Digimon on both entry timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_046.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
  it("has inherited once-per-turn suspension while attacking", () => {
    expect(BT24_046.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });

  it("has Jamming and suspends an opponent Digimon through a public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-046", as: "garurumon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: [{ card: "BT24-051", as: "security" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-046")!;
    expect(observe(s.engine).hasKeyword(played, "Jamming")).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it.each([
    ["normal green requirement", "BT1-065", false, undefined, 3],
    ["Gabumon in name requirement", "BT2-069", true, 0, 2],
    ["TS requirement", "BT24-031", true, 1, 2],
  ])(
    "uses the %s and resolves When Digivolving",
    async (_label, baseCard, useAlternateCost, alternateRequirementIndex, expectedCost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT24-046", as: "garurumon" }],
            deck: [{ card: "BT1-013", as: "evolutionDraw" }],
          },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const sourceId = s.inst("base").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("garurumon").instanceId,
          ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("garurumon").instanceId);
      await settle(() => s.perm("target").isSuspended);

      expect(s.state.memory).toBe(5 - expectedCost);
      expect(s.perm("base").topCard.instanceId).toBe(s.inst("garurumon").instanceId);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    },
  );

  it("lets a pre-existing Garurumon attack higher-DP security through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-046", as: "attacker" }] },
      1: { security: [{ card: "BT24-051", as: "security" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const securityId = s.inst("security").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(securityId);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toContain(attackerId);
  });

  it("rejects a public evolution from a nonmatching level-3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "invalidBase" }],
        hand: [{ card: "BT24-046", as: "garurumon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidBase").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("garurumon").instanceId);
    expect(s.perm("invalidBase").topCard.cardId).toBe("BT1-009");
  });

  it("inherited suspension resets on the owner's next public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-046"] }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 3;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });

  it("activates inherited suspension from a public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-046"] }] },
      1: { security: ["BT1-010"], battleArea: [{ card: "BT1-009", as: "target", suspended: false }] },
    });
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId)!.isSuspended).toBe(true);
  });

  it("suppresses a second same-turn inherited suspension after a public unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-046"] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && !observe(s.engine).isAttacking());
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("unsuspender").instanceId),
    );
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an alternate evolution from a nonmatching level-3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT24-046", as: "garurumon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("base").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("garurumon").instanceId);
  });
});
