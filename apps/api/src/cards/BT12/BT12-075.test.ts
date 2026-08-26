import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-075.js";

describe("BT12-075 Psychemon", () => {
  it("uses the printed Save evolution and DigiXros requirements through public intents", async () => {
    expect(digivolutionRequirementsFor("BT12-075")).toContainEqual({
      level: 2,
      texts: ["Save"],
      cost: 0,
      isAlternate: true,
    });
    expect(digiXrosRequirementFor("BT12-075")).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
    const evolution = setupEngine({
      0: {
        battleArea: [{ card: "BT12-005", as: "base" }],
        hand: [{ card: "BT12-075", as: "psyche" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("base").permanentId,
        instanceId: evolution.inst("psyche").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("base").topCard.cardId === "BT12-075");
    expect(evolution.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT12-005"]);

    const xros = setupEngine({
      0: {
        hand: [
          { card: "BT12-075", as: "psyche" },
          { card: "BT10-008", as: "material" },
        ],
      },
    });
    xros.state.memory = 2;
    expect(
      xros.engine.applyIntent(0, {
        type: "playCard",
        instanceId: xros.inst("psyche").instanceId,
        digiXros: { materialInstanceIds: [xros.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => xros.state.players[0]!.battleArea.length === 1);
    expect(xros.state.memory).toBe(0);
    expect(xros.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toEqual([
      xros.inst("material").instanceId,
    ]);
  });

  it("rejects alternate evolution from a plain level 2", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-001", as: "plain" }], hand: [{ card: "BT12-075", as: "psyche" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plain").permanentId,
        instanceId: s.inst("psyche").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("returns a Save Digimon from under a Tamer to hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-094", as: "tamer", under: ["BT10-008"] }],
          hand: [{ card: "BT12-075", as: "psyche" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("psyche").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT10-008"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT10-008");
  });

  it("does not recover a Save Digimon under a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-008"] }],
          hand: [{ card: "BT12-075", as: "psyche" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("psyche").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-075"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT10-008");
  });

  it("may decline recovery and does not recover a non-Save card under a Tamer", async () => {
    for (const [under, options] of [
      ["BT10-008", { autoDeclineOptional: true, autoSelectCards: true }],
      ["BT1-009", { autoAcceptOptional: true, autoSelectCards: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-094", as: "tamer", under: [under] },
              { card: "BT12-075", as: "psyche" },
            ],
          },
        },
        options,
      );
      const underId = s.perm("tamer").stack[0]!.instanceId;
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("psyche"));
      expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(underId);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(underId);
    }
  });

  it("saves itself under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-075", as: "psyche" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("psyche").topCard.instanceId;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("psyche").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId));
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === sourceId)).toBe(true);
  });

  it("may decline Save and remain in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-075", as: "psyche" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("psyche").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("psyche").permanentId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(sourceId);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("draws from its inherited Save attack effect at most once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-077", as: "host", under: ["BT12-075"] }], deck: ["BT1-010", "BT1-011"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw from the inherited effect for a non-Save host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-075"] }], deck: ["BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
