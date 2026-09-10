import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-062.js";
describe("BT1-062 SlashAngemon", () => {
  it("matches the catalog and exact compiled IR contract", () => {
    expect(getCardDefinition("BT1-062")).toMatchObject({
      cardId: "BT1-062",
      set: "BT1",
      nameEn: "SlashAngemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 8000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Authority"],
      effectText: "[When Digivolving] 1 of your opponent's Digimon gets -8000 DP for the turn.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-062",
      nameJp: "スラッシュエンジェモン",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -8000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("deletes an opposing Digimon reduced to 0 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-059", as: "base" }],
          hand: [{ card: "BT1-062", as: "evolving" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-064", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-059"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("reduces a surviving target for the turn and restores it at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-059", as: "base" }],
          hand: [{ card: "BT1-062", as: "evolving" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("resolves cleanly when the opponent controls no Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-059", as: "base" }],
        hand: [{ card: "BT1-062", as: "evolving" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-062");

    expect(s.state.memory).toBe(0);
  });

  it("rejects evolution from a red level 5 despite matching the evolution level", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-024", as: "redBase" }], hand: [{ card: "BT1-062", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
