import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-240.js";

describe("P-240 Arcturusmon", () => {
  it("has Collision, Piercing, Reboot, and Blocker", () => {
    const keywords = runtimeCompiledCard("P-240")!
      .effects.filter((effect) => effect.trigger === "Static")
      .flatMap((effect) => effect.keywords ?? []);
    expect(keywords.map((keyword) => keyword.keyword)).toEqual(["Collision", "Piercing", "Reboot", "Blocker"]);
  });

  it("de-digivolves on play and when digivolving, then uses two qualifying trash cards", () => {
    const effects = runtimeCompiledCard("P-240")!.effects;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({ kind: "DeDigivolve", amount: 3 }),
            expect.objectContaining({
              kind: "GrantStatic",
              duration: "untilOpponentTurnEnd",
              tokens: ["GRANTEFFECT23TOKEN"],
              cost: expect.objectContaining({
                kind: "place",
                destination: "digivolutionStack",
                position: "bottom",
                target: expect.objectContaining({ count: 2 }),
              }),
            }),
          ],
        }),
      );
    }
  });

  it("plays Proximamon from hand or trash on deletion and redirects one attack once per turn", () => {
    const effects = runtimeCompiledCard("P-240")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            actions: [expect.objectContaining({ kind: "RedirectAttack", optional: true })],
          }),
        ],
      }),
    );
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-240 engine behavior", () => {
  it("de-digivolves three cards and places two qualifying trash cards underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-240", as: "arcturusmon" }],
          trash: ["EX12-007", "EX12-013"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-009", "BT1-070", "BT1-020"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("arcturusmon"));
    await settle();
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.perm("arcturusmon").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-007")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-013")).toBe(false);
  });
});

describe("P-240 continuous behavior", () => {
  it("grants Collision to a resident Arcturusmon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-240", as: "arcturusmon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("arcturusmon").permanentId, "Collision")).toBe(true);
  });
});
