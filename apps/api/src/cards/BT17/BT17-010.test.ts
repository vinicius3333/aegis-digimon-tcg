import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT17-013.js";
import { compiled } from "./BT17-010.js";

describe("BT17-010", () => {
  it("registers the mandatory When Digivolving delete-or-DP effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 } },
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3000,
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
  });

  it("registers the inherited DP deletion maximum effect", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "dpDeletion",
          amount: 2000,
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
    });
  });

  it("deletes a legal 4000-DP target on natural digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("rookie").topCard.cardId).toBe("BT17-010");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("gets +3000 DP when natural digivolution has no deletable target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "rookie", under: ["BT17-001"] }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookie").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookie").topCard.cardId === "BT17-010");

    expect(s.perm("rookie").currentDP).toBe(8000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("raises another DP deletion threshold from an inherited stack card at memory 0", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-010", as: "growlmon", under: ["BT17-001"] }],
          hand: [{ card: "BT17-013", as: "wargrowlmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("growlmon").permanentId,
        instanceId: s.inst("wargrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("growlmon").topCard.cardId).toBe("BT17-013");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });
});
