import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX12-058.js";
import "../index.js";

describe("EX12-058 HiAndromon", () => {
  it("maps both evolution routes, the shared reveal timing, and permanent ME keywords", () => {
    const card = getCardDefinition("EX12-058");
    expect(card?.effectText).toContain("[Machine], [Cyborg] or [ME]");
    expect(digivolutionRequirementsFor("EX12-058")).toEqual([{ level: 5, traits: ["ME"], cost: 3, isAlternate: true }]);
    expect(dnaDigivolutionRequirementsFor("EX12-058")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Black", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "trash",
            add: [{ count: 1, to: "play", optional: true, filter: { playCostLte: 7 } }],
          },
        ],
      });
    }

    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Alliance" }, duration: "permanent", target: { count: "all" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "permanent", target: { count: "all" } },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays exactly one matching revealed card without cost and trashes the other reveals", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-058", as: "hiandromon" }],
          deck: ["BT3-066", "BT14-062", "BT14-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiandromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT3-066"));
    await settle(() => false, 80);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX12-058", "BT3-066"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT14-062", "BT14-015"]),
    );
    expect(s.state.memory).toBe(-1);
  });

  it("grants Alliance and Reboot to every own ME Digimon, but not to a non-ME Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-058", as: "hiandromon" },
          { card: "EX12-055", as: "me" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Alliance", "Reboot"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("hiandromon"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("me"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
    }
  });

  it("trashes all revealed cards when no Machine, Cyborg, or ME card matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-058", as: "hiandromon" }],
          deck: ["BT1-009", "BT1-014", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiandromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-058"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-014", "BT1-016"]),
    );
  });
});
