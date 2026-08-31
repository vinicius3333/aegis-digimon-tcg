import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-040.js";

describe("BT23-040 Wormmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-040")).toMatchObject({
      cardId: "BT23-040",
      nameEn: "Wormmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 1 }],
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Larva", "Hudie", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("moves an in-play Erika to the stack bottom and evolves into Hudiemon from hand for 2 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-084", as: "erika" },
          ],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const erikaId = s.perm("erika").topCard!.instanceId;
    const erikaPermanentId = s.perm("erika").permanentId;
    const hudiemonId = s.inst("hudiemon").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("wormmon"));

    expect(s.perm("wormmon").topCard?.instanceId).toBe(hudiemonId);
    expect(s.perm("wormmon").stack[0]?.instanceId).toBe(erikaId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === erikaPermanentId)).toBe(false);
  });

  it("gives every own Hudie Digimon +1000 DP from its inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-101", as: "carrier", under: ["BT23-040"] },
          { card: "BT23-017", as: "ally" },
        ],
      },
    });
    const carrierBaseDp = s.perm("carrier").currentDP;
    const allyBaseDp = s.perm("ally").currentDP;
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(carrierBaseDp + 1000);
    expect(s.perm("ally").currentDP).toBe(allyBaseDp + 1000);
  });

  it("cannot pay the Erika cost from hand or trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-040", as: "wormmon" }],
          hand: [
            { card: "BT23-084", as: "handErika" },
            { card: "BT23-101", as: "hudiemon" },
          ],
          trash: [{ card: "BT23-084", as: "trashErika" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("wormmon"));
    expect(s.perm("wormmon").topCard?.cardId).toBe("BT23-040");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handErika").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashErika").instanceId);
  });

  it("may digivolve this Digimon into Hudiemon from hand or trash with a two-cost reduction", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["Hudiemon"], match: "name" }],
      },
      from: ["hand", "trash"],
      payCost: true,
      useAlternateCost: true,
      reduceCost: 2,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        optional: true,
        targetIsPermanent: true,
        target: {
          filter: {
            controller: "mine",
            nameOrTrait: [{ tokens: ["Erika Mishima"], match: "name" }],
          },
          count: 1,
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
  });

  it("may decline the Erika processing condition before moving her under Wormmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-040", as: "wormmon" },
            { card: "BT23-084", as: "erika" },
          ],
          hand: [{ card: "BT23-101", as: "hudiemon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const erikaPermanentId = s.perm("erika").permanentId;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("wormmon"));
    expect(s.perm("wormmon").topCard?.cardId).toBe("BT23-040");
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === erikaPermanentId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hudiemon").instanceId);
  });

  it("inherits the all-Hudie continuous DP bonus", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
    });
  });

  it("digivolves for 0 from an off-color level-2 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-002", as: "base" }], hand: [{ card: "BT23-040", as: "wormmon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("wormmon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT23-040", as: "wormmon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("wormmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
