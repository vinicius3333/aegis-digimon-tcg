import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-080.js";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-080 compiled behavior", () => {
  it("proves dual-card keywords and Bacchusmon evolution", () => {
    expect(getCardDefinition("BT26-080")).toMatchObject({
      kinds: ["Digimon", "Option"],
      isDualCard: true,
      dualEffect: "Reversal of the Dead",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Bacchusmon"], basePlayCost: 12, cost: 2, isAlternate: true },
    ]);
    expect(compiled.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
        expect.objectContaining({ keyword: "Succession" }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Attack",
          withoutSuspending: true,
          cost: { kind: "suspend", target: { filter: { kind: ["Digimon"] }, count: 1 } },
        },
      ],
    });
    expect(compiled.effects.slice(2)).toMatchObject([
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }] },
      {
        trigger: "Main",
        actions: [
          { kind: "Unsuspend", target: { filter: { kind: ["Digimon"] }, count: 1 }, optional: true },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], suspended: false, superlative: "lowestDP" },
              count: "all",
            },
          },
        ],
      },
    ]);
  });

  it("encodes Q7112 as a source-relative live orientation filter", () => {
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], sameOrientationAsSource: true } },
    });
  });

  it("deletes only an opposing Digimon with the same live orientation", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-080", as: "source", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "same", suspended: true },
            { card: "BT1-011", as: "different", suspended: false },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });

  it("uses the DUAL Option with a TS use requirement and may unsuspend either player's Digimon (Q7114)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-086", as: "ts" }],
          hand: [{ card: "BT26-080", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentSuspended", suspended: true, dp: 3000 },
            { card: "BT1-080", as: "opponentHigher", suspended: false, dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-080"]);
  });
});
