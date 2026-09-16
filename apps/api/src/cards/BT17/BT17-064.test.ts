import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-064.js";
import "./index.js";
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

  it("Q2816: an inherited mid-attack source trash does not retroactively arm the delete", async () => {
    const s = setupEngine(
      {
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

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([targetId]);
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
    await settle(() => s.perm("pipismon").topCard.cardId !== "BT17-064");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
