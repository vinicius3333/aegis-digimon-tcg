import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-073.js";

describe("BT1-073 Kabuterimon", () => {
  it("matches the catalog and inherited DP IR contract", () => {
    expect(getCardDefinition("BT1-073")).toMatchObject({
      cardId: "BT1-073",
      set: "BT1",
      nameEn: "Kabuterimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 1 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Insectoid"],
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-073",
      nameJp: "カブテリモン",
    });
    expect(getCardDefinition("BT1-073")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-073")?.inheritedEffectText).toBe(
      "[Your Turn] This Digimon gets +1000 DP for every suspended Digimon your opponent has.",
    );
    expect(getCardDefinition("BT1-073")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "forTheTurn",
              scaling: {
                per: 1,
                unit: "cards",
                filter: { controller: "opponent", kind: ["Digimon"], suspended: true },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("reaches a level 5 host through a legal level 3 to level 4 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [
          { card: "BT1-073", as: "kabuterimon" },
          { card: "BT1-075", as: "host" },
        ],
        deck: ["BT1-009", "BT1-014"],
      },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
        ],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("kabuterimon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("host").instanceId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-064", "BT1-073"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").currentDP).toBe(9000);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-073", as: "kabuterimon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("kabuterimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives +1000 DP for each suspended opposing Digimon during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-017", suspended: true },
          { card: "BT1-085", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("gives no DP when every opposing Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: { battleArea: [{ card: "BT1-016" }, { card: "BT1-017" }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("counts suspended opposing Digimon but not a suspended Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: {
        battleArea: [
          { card: "BT1-016", suspended: true },
          { card: "BT1-085", suspended: true },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("gives no DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "host", dp: 5000, under: ["BT1-073"] }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not apply while Kabuterimon is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-073", as: "kabuterimon", dp: 5000 }] },
      1: { battleArea: [{ card: "BT1-016", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("kabuterimon").currentDP).toBe(5000);
  });
});
