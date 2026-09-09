import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-064.js";
import "./index.js";
// Every card this file puts on the board is imported so its real effects are registered when the
// file runs alone. `./index.js` only covers BT17; the digivolution sources live in other sets.
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT16/BT16-016.js";

describe("BT17-064 Pipismon", () => {
  it("trashes the bottom two digivolution cards of one opposing Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 2,
      fromTop: false,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("deletes the combat target only when both Digimon have no digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      // `whenAttacking` reads its subject through `triggerFilter`, and the defender gate has to
      // sit on the sub-effect's own action so it is evaluated when the watcher fires.
      triggerFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Delete",
          target: { sourceRef: "triggerDefender", filter: {}, count: 1 },
          condition: {
            kind: "attackTargetMatchesFilter",
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasNone" },
          },
        },
      ],
    });
  });

  it("requires the exact printed [Patamon] name on the digivolution source", () => {
    // Printed `[Digivolve][Patamon]` is an exact name. `names` is the SUBSTRING field
    // (packages/shared/src/effects/ir/requirements/digivolve.ts) and would also admit a source
    // whose name merely contains "Patamon".
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Patamon"], cost: 2, isAlternate: true }]);
  });

  it("uses the Patamon evolution route and trashes exactly two bottom sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-016", as: "patamon" }],
          hand: [{ card: "BT17-064", as: "pipismon" }],
        },
        1: {
          battleArea: [{ card: "BT17-070", under: ["BT1-010", "BT1-011", "BT17-025"], as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("patamon").permanentId,
        instanceId: s.inst("pipismon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT17-025"]);
    // The two trashed sources land in their owner's trash, and the alternate route charged 2
    // rather than the catalog's 3, so memory dropped by exactly the printed [Patamon] cost.
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("patamon").topCard.cardId).toBe("BT17-064");
    expect(s.perm("patamon").stack.map((card) => card.cardId)).toEqual(["BT16-016"]);
  });

  it("refuses the [Patamon] route from a source that is not named Patamon", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "agumon" }],
        hand: [{ card: "BT17-064", as: "pipismon" }],
      },
    });
    s.state.memory = 2;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("agumon").permanentId,
      instanceId: s.inst("pipismon").instanceId,
      alternateRequirementIndex: 0,
    });

    expect(result).not.toEqual({ ok: true });
    expect(s.perm("agumon").topCard.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(2);
  });

  // KB Q2816. `attackTargetMatchesFilter` answers the digivolution-stack half of its filter from
  // `trigger.defenderAtDeclaration`, the snapshot the combat controller captures at attack
  // declaration, so a same-window [When Attacking] effect that strips the defender's sources
  // (here BT16-016 [Patamon]'s inherited trash) cannot retroactively arm the delete.
  // See docs/audits/BT17-reaudit/ATTACK-TARGET-DECLARATION-SNAPSHOT-MECHANISM.md.
  it("Q2816: an inherited mid-attack source trash does not retroactively arm the delete", async () => {
    const s = setupEngine(
      {
        // BT16-016 [Patamon]'s inherited [When Attacking] trashes the top digivolution card of 1
        // opposing Digimon. The defender therefore ends the attack with no sources, but it HAD
        // one when the attack was declared, so BT17-064's [Your Turn] clause never triggers.
        0: { battleArea: [{ card: "BT17-064", dp: 5000, under: ["BT16-016"], as: "pipismon" }] },
        1: { battleArea: [{ card: "BT17-025", dp: 9000, under: ["BT1-010"], suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pipismon").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The inherited effect did strip the defender's only source...
    expect(s.perm("target").stack).toHaveLength(0);
    // ...and the defender is still on the board: it was not deleted, only Pipismon lost.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([targetId]);
    // Pipismon lost the battle at 5000 DP against 9000. ＜Armor Purge＞ trashes its TOP card
    // instead of deleting the permanent, so BT17-064 itself leaves and its BT16-016 source is
    // promoted — the same endpoint the "had a source when the attack was declared" test proves.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT16-016"]);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
  });

  it("deletes a no-source combat target before battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-064", dp: 5000, as: "pipismon" }] },
      1: {
        battleArea: [
          { card: "BT17-025", dp: 9000, suspended: true, as: "target" },
          { card: "BT17-070", dp: 11000, suspended: true, as: "other" },
        ],
      },
    });
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pipismon").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-070")).toBe(true);
  });

  it("does not trigger if the target had a source when the attack was declared", async () => {
    const s = setupEngine(
      {
        // BT1-010 is the source because it has no inherited effect. BT16-016's inherited
        // [When Attacking] would trash the defender's only digivolution card mid-attack and
        // destroy the very precondition this test is about.
        0: { battleArea: [{ card: "BT17-064", dp: 5000, under: ["BT1-010"], as: "pipismon" }] },
        1: { battleArea: [{ card: "BT17-025", dp: 9000, under: ["BT1-010"], suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const pipismonId = s.perm("pipismon").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: pipismonId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    // Pipismon loses the battle at 5000 DP against 9000 and its ＜Armor Purge＞ trashes the top
    // card instead of deleting the permanent, so the battle is over once the top card changed.
    await settle(() => s.perm("pipismon").topCard.cardId !== "BT17-064");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
