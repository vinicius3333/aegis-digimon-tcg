import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-083.js";

describe("BT18-083 LordKnightmon", () => {
  it("covers Blast Digivolve, Knightmon-text play, and DP-relative Collision", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
            },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Collision" },
          duration: "permanent",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
              dp: { op: "lte", relativeToSource: true },
            },
            count: "all",
          },
        },
      ],
    });
  });

  it("naturally grants Collision to qualifying Digimon on either side of the field", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-083", as: "lordKnightmon" },
          { card: "BT1-009", as: "ownLow", dp: 3000 },
          { card: "BT1-060", as: "ownHigh", dp: 13000 },
          { card: "BT18-087", as: "ownTamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "opponentLow", dp: 3000 },
          { card: "BT1-060", as: "opponentHigh", dp: 13000 },
          { card: "BT18-087", as: "opponentTamer" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("ownLow"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponentLow"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ownHigh"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentHigh"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ownTamer"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentTamer"), "Collision")).toBe(false);
  });

  it("includes an exactly equal-DP Digimon and excludes only higher DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-083", as: "lordKnightmon" }] },
      1: {
        battleArea: [
          { card: "BT1-060", as: "equal", dp: 12000 },
          { card: "BT1-060", as: "higher", dp: 12001 },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("equal"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("higher"), "Collision")).toBe(false);
  });

  it("plays a level-5-or-lower Knightmon-text Digimon and rejects a near-match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-066", as: "base" }],
          hand: [
            { card: "BT18-083", as: "lordKnightmon" },
            { card: "BT18-058", as: "knightmonText" },
            { card: "BT1-009", as: "nearMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lordKnightmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("knightmonText").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("knightmonText").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nearMatch").instanceId)).toBe(true);
  });
});
