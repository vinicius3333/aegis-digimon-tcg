import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX11-009 Tyrannomon", () => {
  it("encodes the alternate Reptile evolution and conditional optional play", () => {
    const compiled = runtimeCompiledCard("EX11-009")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Reptile"], cost: 2, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: expect.objectContaining({
            filter: expect.objectContaining({ nameOrTrait: [{ match: "nameExact", tokens: ["Ryutaro Williams"] }] }),
            count: 1,
          }),
          condition: {
            kind: "permanentCount",
            op: "lte",
            value: 1,
            filter: { controllerDefault: "mine", kind: ["Tamer"] },
            raw: "you have 1 or fewer Tamers",
          },
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000, duration: "permanent" })],
    });
  });

  it("evolves from a Reptile for cost 2 and plays Ryutaro with no Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "base", dp: 1000 }],
          hand: [
            { card: "EX11-009", as: "tyrannomon" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const base = s.perm("base");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-056"));

    expect(base.topCard?.cardId).toBe("EX11-009");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-056")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("still plays Ryutaro with exactly 1 Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-008", as: "base" },
            { card: "EX11-056", as: "existingTamer" },
          ],
          hand: [
            { card: "EX11-009", as: "tyrannomon" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX11-056").length === 2);

    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX11-056")).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("does not offer Ryutaro with 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "base" }, { card: "EX11-056" }, { card: "EX11-056" }],
          hand: [
            { card: "EX11-009", as: "tyrannomon" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-009");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ryutaro").instanceId);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX11-056")).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("plays no other Tamer from hand: the target is named [Ryutaro Williams]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "base" }],
          hand: [
            { card: "EX11-009", as: "tyrannomon" },
            { card: "EX11-057", as: "otherTamer" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-009");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("otherTamer").instanceId);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "EX11-057")).toHaveLength(
      0,
    );
    assertNoLoudGap(s);
  });

  it("may decline the free Ryutaro play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-008", as: "base" }],
          hand: [
            { card: "EX11-009", as: "tyrannomon" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-009");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ryutaro").instanceId);
    assertNoLoudGap(s);
  });

  it("rejects the Reptile alternate path on a non-Reptile blue level 3", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-013", as: "mollusk" }],
        hand: [{ card: "EX11-009", as: "tyrannomon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mollusk").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("adds 1000 DP only as an inherited effect on all turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-010", as: "host", under: ["EX11-009"] },
          { card: "EX11-009", as: "standalone" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").baseDP).toBe(7000);
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("standalone").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
