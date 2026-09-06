import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-028.js";
import "./index.js";

describe("BT20-028 GigaSeadramon", () => {
  it("once per turn plays a level 5 or lower stack card only with the required name or trait", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { tokens: ["MetalSeadramon"], match: "name" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
          },
        },
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { levelComparison: { op: "lte", value: 5 } }, source: "thisDigimon" },
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
          actions: [{ kind: "DeDigivolve", amount: 2 }],
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(3);
  });

  it("plays a level-5 card only from its own qualifying stack and de-digivolves by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-031", as: "giga", under: ["BT20-026"] },
            { card: "BT20-027", as: "otherHost", under: ["BT20-025"] },
          ],
          hand: [{ card: "BT20-028", as: "gigaEvolution" }],
        },
        1: { battleArea: [{ card: "BT20-017", as: "opponentStack", under: ["BT20-014", "BT20-013"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("giga").permanentId,
        instanceId: s.inst("gigaEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-026"));

    expect(s.perm("giga").stack.map((card) => card.cardId)).toEqual(["BT15-031"]);
    expect(s.perm("otherHost").stack.map((card) => card.cardId)).toEqual(["BT20-025"]);
    expect(s.perm("opponentStack").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("giga"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("giga"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("giga"), "Blocker")).toBe(true);
  });

  it("does not play a stack card without MetalSeadramon or X Antibody in its sources", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT20-028", as: "giga", under: ["BT20-023", "BT20-025"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("giga"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("giga").stack.map((card) => card.cardId)).toEqual(["BT20-023", "BT20-025"]);
  });

  it("reaches GigaSeadramon from a legal MegaSeadramon/X Antibody stack through public evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-026", as: "mega", under: ["BT20-024"] }],
        hand: [{ card: "BT20-028", as: "giga" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mega").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT20-028");
    expect(s.perm("mega").topCard.cardId).toBe("BT20-028");
    expect(s.perm("mega").stack.map((card) => card.cardId)).toEqual(["BT20-024", "BT20-026"]);
  });
});
