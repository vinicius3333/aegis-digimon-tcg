import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-014.js";
import "../index.js";

const inertSecurity = ["BT1-009"];

describe("EX2-014 IceDevimon", () => {
  it("matches the catalog and compiles the printed return clause", () => {
    expect(getCardDefinition("EX2-014")).toMatchObject({
      cardId: "EX2-014",
      nameEn: "IceDevimon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Fallen Angel"],
      effectText:
        "[When Attacking] Return 1 of your opponent's level 4 or lower Digimon with no digivolution cards to its owner's hand.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Return",
              to: "hand",
              target: {
                count: 1,
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 4 },
                  digivolutionCards: "none",
                },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("returns an opposing source-free level-4 Digimon to its owner's hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX2-016", as: "sourced", under: ["EX2-013"] },
            { card: "EX2-016", as: "level4" },
            { card: "EX2-023", as: "level5" },
          ],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const returnedId = s.perm("level4").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([returnedId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("sourced").permanentId,
      s.perm("level5").permanentId,
    ]);
  });

  it("does not return a sourced level-4 or a level-5 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX2-016", as: "sourced", under: ["EX2-013"] },
            { card: "EX2-023", as: "level5" },
          ],
          security: inertSecurity,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("returns the card after a legal blue level-3 evolution and preserves stack, cost, and draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-013", as: "source" }],
          hand: [{ card: "EX2-014", as: "evolution" }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "EX2-016", as: "target" }], security: inertSecurity },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX2-014");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX2-013"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand[0]!.cardId).toBe("EX2-016");
  });

  it("rejects evolution from a non-blue level-3 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-019", as: "yellowSource" }],
        hand: [{ card: "EX2-014", as: "evolution" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
