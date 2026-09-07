import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-012.js";

describe("BT20-012 Ginryumon", () => {
  it("optionally digivolves from hand while attacking and carries both alternate requirements", () => {
    expect(compiled.effects.find((entry) => !entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            nameOrTrait: [
              { tokens: ["Hisyaryumon"], match: "name" },
              { tokens: ["Chronicle"], match: "trait" },
            ],
          },
          from: ["hand"],
          payCost: true,
          useAlternateCost: true,
          optional: true,
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000 }],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Ryudamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["Chronicle"], cost: 2, isAlternate: true },
    ]);
  });

  it("observably pays the alternate cost to evolve into Hisyaryumon while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "ginryumon", under: ["BT20-010"] }],
          hand: [{ card: "BT20-015", as: "hisyaryumon" }],
        },
        1: { security: ["BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ginryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ginryumon").topCard.cardId === "BT20-015");
    expect(s.state.memory).toBe(0);
    expect(s.perm("ginryumon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-012", "BT20-010"]),
    );

    const nonMatch = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-012", as: "ginryumon" }], hand: ["BT20-011"] },
        1: { security: ["BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonMatch.state.memory = 5;
    expect(
      nonMatch.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonMatch.perm("ginryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(nonMatch.perm("ginryumon").topCard.cardId).toBe("BT20-012");
  });

  it("publicly reaches a Chronicle-only non-Hisyaryumon destination at its exact alternate cost", async () => {
    const chronicle = getCardDefinition("BT20-053")!;
    expect(chronicle.nameEn).not.toBe("Hisyaryumon");
    expect(chronicle.types).toContain("Chronicle");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "ginryumon", under: ["BT20-010"] }],
          hand: [{ card: "BT20-053", as: "grademon" }],
        },
        1: { security: ["BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ginryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ginryumon").topCard.cardId === "BT20-053");
    expect(s.state.memory).toBe(2); // Chronicle alternate cost 3, paid during the attack
    expect(s.perm("ginryumon").stack.map((card) => card.cardId)).toEqual(["BT20-010", "BT20-012"]);
    expect(s.perm("ginryumon").currentDP).toBe(chronicle.dp + 9000); // Ryudamon +2000, Ginryumon +2000, Grademon +5000
  });

  it("observably grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-015", dp: 7000, as: "host", under: ["BT20-012"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("reaches Ginryumon from a legal Ryudamon stack through a public evolution intent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "ryudamon" }], hand: [{ card: "BT20-012", as: "ginryumon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ryudamon").permanentId,
        instanceId: s.inst("ginryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryudamon").topCard.cardId === "BT20-012");
    expect(s.perm("ryudamon").topCard.cardId).toBe("BT20-012");
    expect(s.perm("ryudamon").stack.map((card) => card.cardId)).toEqual(["BT20-010"]);
  });

  it("can refuse the optional attacking evolution while preserving the hand card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-012", as: "ginryumon" }], hand: [{ card: "BT20-015", as: "candidate" }] },
        1: { security: ["BT20-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ginryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(s.perm("ginryumon").topCard.cardId).toBe("BT20-012");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });
});
