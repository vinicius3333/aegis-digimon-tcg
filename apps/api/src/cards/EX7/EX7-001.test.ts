import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-001.js";

describe("EX7-001 DemiMeramon", () => {
  it("matches the catalog and compiles the complete inherited clause", () => {
    expect(getCardDefinition("EX7-001")).toMatchObject({
      cardId: "EX7-001",
      nameEn: "DemiMeramon",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      attributes: ["-"],
      types: ["Flame"],
      inheritedEffectText: "[Your Turn] While your opponent has 1 or fewer Digimon, this Digimon gets +2000 DP.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "modifyDP", amount: 2000 },
            while: {
              kind: "opponentHas",
              filter: { controllerDefault: "opponent", kind: ["Digimon"] },
              countMax: 1,
              raw: "your opponent has 1 or fewer Digimon",
            },
          },
        ],
        isInherited: true,
      },
    ]);
  });

  it.each([
    { label: "no opposing Digimon", opposing: [], expected: 3000 },
    { label: "one opposing Digimon", opposing: ["BT1-009"], expected: 5000 },
    { label: "two opposing Digimon", opposing: ["BT1-009", "BT1-010"], expected: 3000 },
  ])("applies the exact 1-or-fewer boundary with $label", async ({ opposing, expected }) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX7-001"] },
          { card: "BT1-010", as: "ownPeer" },
        ],
      },
      1: { battleArea: opposing },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(expected);
    expect(s.perm("ownPeer").currentDP).toBe(2000);
  });

  it("does not count an opposing Tamer and keeps the Aura self-only", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-001"] }] },
      1: { battleArea: [{ card: "BT1-088", as: "opponentTamer" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.perm("opponentTamer").currentDP).toBe(0);
  });

  it("is live only during the host controller's turn through the real turn loop", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-001"] }],
        deck: ["BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("host").currentDP).toBe(5000);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses the public hatch -> breeding digivolution -> raise route and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX7-001", as: "egg" }],
        hand: [{ card: "BT1-009", as: "monodramon" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-001");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("monodramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-009");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("monodramon").instanceId)).toBe(
      false,
    );
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();

    await advance(s.engine).waitForMainPhase(0);
    const host = s.perm("monodramon");
    expect(host.topCard?.cardId).toBe("BT1-009");
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(host.currentDP).toBe(5000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects the companion evolution route from a non-red level 2 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-007", as: "wrongSource" }],
        hand: [{ card: "BT1-009", as: "monodramon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("monodramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(0);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-007");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("monodramon").instanceId)).toBe(
      true,
    );
  });
});
