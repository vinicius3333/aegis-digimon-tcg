import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX7-011.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-011 Megadramon", () => {
  it("matches the catalog printing and complete IR", () => {
    expect(getCardDefinition("EX7-011")).toMatchObject({
      cardId: "EX7-011",
      nameEn: "Megadramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      inheritedEffectText: "＜Piercing＞.",
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Three Musketeers"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } },
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
            },
            from: ["hand", "trash"],
          },
        },
        optional: true,
        abortOnDecline: true,
      });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("inherits Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Piercing"));

  it("publicly plays from hand, pays 7, places the Option, and deletes at the 6000 DP boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-011", as: "megadramon" },
            { card: "EX7-071", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "deckCard" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("megadramon").topCard?.cardId === "EX7-011" && s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckCard").instanceId]);
    expect(s.perm("megadramon").stack.map((card) => card.cardId)).toEqual(["EX7-071"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("publicly digivolves through the alternate text route, draws 1, and places a trash Option at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-010", as: "source" }],
          hand: [{ card: "EX7-011", as: "megadramon" }],
          trash: [{ card: "EX7-071", as: "option" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 5000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceInstanceId = s.perm("source").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("megadramon").instanceId,
        alternateRequirementIndex: 0,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX7-011" && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.perm("source").topCard?.cardId).toBe("EX7-011");
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([
      s.inst("option").instanceId,
      sourceInstanceId,
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("rejects the alternate evolution from a level-4 source without Three Musketeers in its text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-014", as: "illegalSource" }], hand: [{ card: "EX7-011", as: "megadramon" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("illegalSource").permanentId,
      instanceId: s.inst("megadramon").instanceId,
      alternateRequirementIndex: 0,
      useAlternateCost: true,
    });

    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("illegalSource").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("megadramon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("places the payable by-condition when no opposing Digimon meets the deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-011", as: "megadramon" },
            { card: "EX7-071", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 7000, as: "tooLarge" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("megadramon").topCard?.cardId === "EX7-011");

    // §15-7-5 permits paying the `by` condition even when the following deletion has no
    // eligible target. The Option is placed while the 7000-DP target remains alive.
    expect(s.state.memory).toBe(3);
    expect(s.perm("megadramon").stack.map((card) => card.cardId)).toEqual(["EX7-071"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tooLarge").currentDP).toBe(7000);
  });

  it("does not place or delete when the optional Three Musketeers condition is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-011", as: "megadramon" },
            { card: "EX7-071", as: "option" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("megadramon").topCard?.cardId === "EX7-011");

    expect(s.state.memory).toBe(3);
    expect(s.perm("megadramon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("uses inherited Piercing to check security after deleting an opposing battle target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 7000, as: "attacker", under: ["EX7-011"] }] },
      1: { security: ["BT1-009"], battleArea: [{ card: "BT1-009", dp: 3000, suspended: true, as: "defender" }] },
    });
    await s.ready();
    const securityBefore = s.state.players[1]!.security.length;
    const defender = s.perm("defender");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === defender.permanentId));

    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
  });
});
