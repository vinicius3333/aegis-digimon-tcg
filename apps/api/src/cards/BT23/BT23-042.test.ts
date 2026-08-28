import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-042.js";

describe("BT23-042 Waspmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-042")).toMatchObject({
      cardId: "BT23-042",
      nameEn: "Waspmon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody", "Royal Base", "CS", "Insectoid"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Royal Base", "CS"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays a Tamer containing Royal Base in its text from hand without paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-042", as: "wasp" }],
          hand: [{ card: "BT23-083", as: "fei" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const feiId = s.inst("fei").instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wasp"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === feiId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === feiId)).toBe(true);
  });

  it("applies the inherited all-turns DP bonus to its carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-046", as: "host", under: ["BT23-042"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);
  });

  it("does not play the Tamer when already controlling two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-042", as: "wasp" },
            { card: "BT23-083", as: "first" },
            { card: "BT23-084", as: "second" },
          ],
          hand: [{ card: "BT23-083", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wasp"));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("boosts only friendly Royal Base Digimon from face-up security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT23-042", as: "securityWasp" }],
        battleArea: [
          { card: "BT23-043", as: "royalBase" },
          { card: "BT23-041", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT23-043", as: "opposingRoyalBase" }] },
    });
    const ownDp = s.perm("royalBase").currentDP;
    const otherDp = s.perm("other").currentDP;
    const opposingDp = s.perm("opposingRoyalBase").currentDP;
    s.inst("securityWasp").faceUp = true;
    await s.ready();
    expect(s.perm("royalBase").currentDP).toBe(ownDp + 1000);
    expect(s.perm("other").currentDP).toBe(otherDp);
    expect(s.perm("opposingRoyalBase").currentDP).toBe(opposingDp);
  });

  it("grants +1000 DP to all Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isSecurity) as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("may play a Royal Base-in-text Tamer from hand when you have at most one Tamer", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any).actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Royal Base"], match: "text" }] },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      condition: {
        kind: "permanentCount",
        op: "lte",
        value: 1,
        filter: { controllerDefault: "mine", kind: ["Tamer"] },
      },
      optional: true,
    });
  });

  it("inherits +1000 DP during all turns", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it.each(["BT23-038", "BT23-037"])("digivolves for 2 from a level-3 Royal Base/CS card (%s)", (base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-042", as: "wasp" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wasp").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});
