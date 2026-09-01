import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-041.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("BT26-041 Hudiemon", () => {
  it("exposes the printed level-3 Larva/Insectoid/NSp evolution", () => {
    expect(digivolutionRequirementsFor("BT26-041")).toContainEqual({
      level: 3,
      traits: ["Larva", "Insectoid", "NSp"],
      cost: 2,
      isAlternate: true,
    });
  });
  it("compiles both play windows with security handoff, recovery, and optional suspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand" },
      { kind: "SecurityManipulation", op: "addTop" },
      { kind: "Suspend", optional: true },
    ]);
    expect(compiled.effects[1]?.actions).toEqual(compiled.effects[0]?.actions);
  });
  it("publicly moves the top security card to hand, recovers from deck, and may suspend a Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-041", as: "hudiemon" }], security: ["AD1-001"], deck: ["AD1-002"] },
        1: {
          battleArea: [
            { card: "BT5-022", as: "opponent" },
            { card: "BT1-085", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players.some((player) => player.battleArea.some((permanent) => permanent.isSuspended)));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-001")).toBe(true);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("AD1-002");
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
  });

  it("resolves the same ordered effect when digivolving, including Recovery from zero security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-066", as: "insectoidBase" }],
        hand: [{ card: "BT26-041", as: "hudiemon" }],
        deck: ["BT1-009", { card: "BT1-010", as: "recovered" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("insectoidBase").permanentId,
        instanceId: s.inst("hudiemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.perm("insectoidBase").topCard.cardId === "BT26-041" && s.state.players[0]!.security.length === 1,
    );
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("recovered").instanceId,
      faceUp: false,
    });
    expect(s.state.players[0]!.hand).toContainEqual(expect.objectContaining({ cardId: "BT1-009" }));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("keeps the mandatory recovery independent when the optional suspension is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-041", as: "hudiemon" }],
          security: [{ card: "BT1-009", as: "oldTop" }],
          deck: [{ card: "BT1-010", as: "recovered" }],
        },
        1: { battleArea: [{ card: "BT1-022", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("oldTop").instanceId }),
    );
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("recovered").instanceId,
      faceUp: false,
    });
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("uses the exact Larva/Insectoid/NSp alternate route and rejects a near-match base", async () => {
    for (const [baseCard, alias] of [
      ["BT3-045", "larvaBase"],
      ["BT1-066", "insectoidBase"],
      ["BT26-035", "nspBase"],
    ] as const) {
      const legal = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: alias }],
          hand: [{ card: "BT26-041", as: "hudiemon" }],
          deck: ["BT1-009"],
        },
      });
      legal.state.memory = 2;
      expect(
        legal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: legal.perm(alias).permanentId,
          instanceId: legal.inst("hudiemon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => legal.perm(alias).topCard.cardId === "BT26-041");
      expect(legal.state.memory, `${baseCard} alternate route`).toBe(0);
    }

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redBase" }],
        hand: [{ card: "BT26-041", as: "hudiemon" }],
      },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("hudiemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("supports both printed Green and Yellow level-3 evolution routes", async () => {
    for (const [baseCard, alias] of [
      ["BT1-065", "greenBase"],
      ["BT1-046", "yellowBase"],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: alias }],
          hand: [{ card: "BT26-041", as: "hudiemon" }],
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("hudiemon").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).topCard.cardId === "BT26-041");
      expect(s.state.memory, `${baseCard} normal route`).toBe(0);
    }
  });

  it("gains one memory when its inherited host wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "winner", dp: 10000, under: ["BT26-041"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
    });
    s.state.memory = 0;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when a different Digimon wins a battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-057", as: "host", under: ["BT26-041"] },
          { card: "BT1-080", as: "ally", dp: 10000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
    });
    s.state.memory = 0;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
  });

  it("enforces the inherited battle-win effect only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "winner", dp: 10000, under: ["BT26-041"] }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "firstVictim", suspended: true, dp: 1000 },
          { card: "BT1-009", as: "secondVictim", suspended: true, dp: 1000 },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    for (const victim of ["firstVictim", "secondVictim"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("winner").permanentId,
          target: { kind: "permanent", permanentId: s.perm(victim).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      if (victim === "firstVictim") await advance(s.engine).verb.unsuspend([s.perm("winner").permanentId]);
    }

    expect(s.state.memory).toBe(1);
  });
});
