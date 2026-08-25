import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-043.js";

describe("BT23-043 CannonBeemon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-043")).toMatchObject({
      cardId: "BT23-043",
      nameEn: "CannonBeemon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "CS", "Insectoid"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Royal Base", "CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses its inherited effect to flip security and preserve another Royal Base Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-046", as: "carrier", under: ["BT23-043"] },
            { card: "BT23-045", as: "protected" },
          ],
          security: [{ card: "BT23-015", as: "faceUpSecurity", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({ faceUp: false });
  });

  it("grants Blocker to all of your Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          keyword: { keyword: "Blocker" },
        },
      ],
    });
  });

  it("grants Blocker live only to friendly Royal Base Digimon on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-043", as: "securityCannon", faceUp: true }],
        battleArea: [
          { card: "BT23-045", as: "royalBase" },
          { card: "BT23-041", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT23-045", as: "opposingRoyalBase" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingRoyalBase"), "Blocker")).toBe(false);
  });

  it("protects itself from an opposing effect but not from its owner's effect", async () => {
    const opposing = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [{ card: "BT23-015", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    opposing.state.turnSeat = 1;
    expect(await advance(opposing.engine).verb.deletePermanent([opposing.perm("cannon").permanentId], "byEffect")).toBe(
      0,
    );
    expect(opposing.state.players[0]!.security[0]).toMatchObject({ faceUp: false });

    const own = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-043", as: "cannon" }],
          security: [{ card: "BT23-015", as: "cost", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    own.state.turnSeat = 0;
    expect(await advance(own.engine).verb.deletePermanent([own.perm("cannon").permanentId], "byEffect")).toBe(1);
    expect(own.state.players[0]!.security[0]).toMatchObject({ faceUp: true });
  });

  it("prevents this Digimon from leaving except by its owner's effects", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanYourEffect",
      actions: [
        {
          kind: "Prevent",
          mode: "leavePlay",
          cost: {
            kind: "flipSecurity",
            target: {
              filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(effect.frequency).toBe("OncePerTurn");
  });

  it("inherits protection for one qualifying Royal Base Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited) as any;
    expect(effect).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: 1,
          },
          leaveCause: "otherThanYourEffect",
        },
      ],
    });
  });

  it.each(["BT23-042", "BT23-041"])("digivolves for 3 from a level-4 Royal Base/CS card (%s)", (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-043", as: "cannon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cannon").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});
