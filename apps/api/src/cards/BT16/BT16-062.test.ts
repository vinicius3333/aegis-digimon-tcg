import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-062.js";
import "../index.js";

describe("BT16-062", () => {
  it("de-digivolves and deletes an opposing Digimon on play or digivolution", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        target: { filter: { dp: { op: "lte", relativeToSource: true } } },
      });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { filter: { playCostLte: 3 } } });
    }
  });

  it("copies effects from Gammamon cards in its stack, including inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          grant: "effects",
          filter: { nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true });
  });

  it("de-digivolves a DP-legal target and deletes a separate low-cost target live", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-062", as: "zan" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "stacked", dp: 4000, under: ["BT1-009"] },
            { card: "BT1-009", as: "low" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zan").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-015")).toBe(true);
  });

  it("executes a copied Gammamon inherited effect on a natural attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-062", as: "zan", under: ["BT10-078"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zan").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT16-062 Zanmetsumon — KB Q&A rulings", () => {
  it("activates the gained [When Digivolving] effect of a [Gammamon] card when digivolving into it (Q2650)", async () => {
    const digivolveOntoBetelGammamon = async (digivolutionCardId: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-019", as: "betel" }],
            hand: [
              { card: digivolutionCardId, as: "evolution" },
              { card: "BT21-080", as: "hiro" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("betel").permanentId,
          instanceId: s.inst("evolution").instanceId,
          ...(digivolutionCardId === "BT16-062" ? { alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("betel").topCard?.cardId === digivolutionCardId);
      await settle(() => false, 50);
      expect(s.perm("betel").topCard?.cardId).toBe(digivolutionCardId);
      return s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT21-080");
    };

    expect(await digivolveOntoBetelGammamon("BT16-062")).toBe(true);
    expect(await digivolveOntoBetelGammamon("BT1-020")).toBe(false);
  });
});
