import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-068.js";

describe("BT12-068 MetalGreymon", () => {
  it("digivolves for 3 from a level-4 Greymon and rejects a same-level near-match", async () => {
    expect(digivolutionRequirementsFor("BT12-068")).toContainEqual({
      level: 4,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "greymon" }],
        hand: [{ card: "BT12-068", as: "metal" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("greymon").permanentId,
        instanceId: legal.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("greymon").topCard.cardId === "BT12-068");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("greymon").stack.map(({ cardId }) => cardId)).toEqual(["BT1-015"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "gorilla" }], hand: [{ card: "BT12-068", as: "metal" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("gorilla").permanentId,
        instanceId: illegal.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("has Raid and gives a Greymon host inherited Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-068", as: "metal" },
          { card: "BT1-015", as: "host", under: ["BT12-068"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
  });

  it("does not grant inherited Piercing to a plain host or on the opponent's turn", async () => {
    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-068"] }] } });
    await plain.ready();
    expect(observe(plain.engine).hasPierce(plain.perm("host"))).toBe(false);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-068"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.engine.recomputeContinuousEffects();
    expect(observe(offTurn.engine).hasPierce(offTurn.perm("host"))).toBe(false);
  });

  it.each(["BT1-085", "BT12-094"])("plays qualifying red or black Tamer %s when a target switches", async (tamer) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: tamer, as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === tamer));
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });

  it("does not play wrong-color or over-cost Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-068", as: "metal" }],
          hand: [
            { card: "BT12-091", as: "yellow" },
            { card: "AD1-020", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("yellow").instanceId,
      s.inst("expensive").instanceId,
    ]);
  });

  it("may decline the optional Tamer play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-068", as: "metal" }], hand: [{ card: "BT1-085", as: "tai" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("tai").instanceId]);
  });

  it("plays at most one Tamer per turn from target-switch triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-068", as: "metal" },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [
            { card: "BT1-085", as: "tai1" },
            { card: "BT1-085", as: "tai2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT1-085").length === 1,
    );
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT1-085")).toHaveLength(1);
  });
});
