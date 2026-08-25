import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-055.js";

describe("BT18-055 AncientTroymon", () => {
  it("trashes the opponent's top security card when their Digimon becomes suspended", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Replacement", actions: [{ kind: "Modal", choose: 1, optional: true }] }],
    });
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Arbormon"] }, { names: ["Petaldramon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-055", as: "ancientTroymon" }] },
      1: {
        battleArea: [{ card: "BT1-030", as: "opponentDigimon" }],
        security: ["BT1-010", "BT1-011"],
      },
    });
    const top = s.state.players[1]!.security[0]!.instanceId;

    await advance(s.engine).verb.suspend([s.perm("opponentDigimon").permanentId]);
    await settle(() => !s.state.players[1]!.security.some((card) => card.instanceId === top));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === top)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("opponentDigimon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponentDigimon").permanentId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it.each([
    [0, "hand"],
    [1, "battleArea"],
  ] as const)("may choose leave-play option %i to move an eligible stack card to %s", async (optionIndex, zone) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT18-055", as: "ancient", under: ["BT18-047"] }] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: optionIndex === 0,
        preferOptionIndex: optionIndex,
      },
    );
    await s.ready();
    const materialId = s.perm("ancient").stack[0]!.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byRule")).toBe(1);
    await settle(() =>
      zone === "hand"
        ? s.state.players[0]!.hand.some(({ instanceId }) => instanceId === materialId)
        : s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === materialId),
    );

    expect(
      zone === "hand"
        ? s.state.players[0]!.hand.some(({ instanceId }) => instanceId === materialId)
        : s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === materialId),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("DigiXroses with one Arbormon and one Petaldramon for 4 less", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-055", as: "ancient" },
          { card: "BT18-047", as: "arbormon" },
          { card: "BT18-050", as: "petaldramon" },
        ],
      },
    });
    s.state.memory = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("arbormon").instanceId, s.inst("petaldramon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId).sort()).toEqual([
      "BT18-047",
      "BT18-050",
    ]);
    assertNoLoudGap(s);
  });

  it("rejects duplicate Arbormon for the distinct DigiXros slots", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-055", as: "ancient" },
          { card: "BT18-047", as: "arbormonA" },
          { card: "BT18-047", as: "arbormonB" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("arbormonA").instanceId, s.inst("arbormonB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    assertNoLoudGap(s);
  });
});
