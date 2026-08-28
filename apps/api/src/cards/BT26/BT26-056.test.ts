import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-056.js";
import "../index.js";

describe("BT26-056 Cerberusmon: Werewolf Mode", () => {
  it("encodes the three keywords, Dark Animal rule trait, deletion play, TS waiver, and empty-hand-safe De-Digivolve Main", () => {
    expect(digivolutionRequirementsFor("BT26-056")).toEqual(
      expect.arrayContaining([
        { names: ["Cerberusmon"], cost: 1, isAlternate: true },
        { level: 4, traits: ["TS"], cost: 3, isAlternate: true },
      ]),
    );
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Jamming" }),
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Blocker" }),
      ]),
    );
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
    });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Trash" }, { kind: "DeDigivolve", amount: 3 }],
    });
  });

  it("publicly plays a level 4-or-lower Titan from the trash when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-056", as: "werewolf" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("werewolf").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
  });

  it("plays only a level-4-or-lower Titan from a mixed trash pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-056", as: "werewolf" }],
          trash: [
            { card: "BT26-021", as: "validTitan" },
            { card: "BT25-071", as: "tooHighTitan" },
            { card: "BT26-026", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("werewolf").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT25-071", "BT26-026"]),
    );
  });

  it("doesn't replay its own level 5 card when no level 4-or-lower Titan is in trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-056", as: "werewolf" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("werewolf").topCard.instanceId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("werewolf").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(sourceId);
  });

  it("publishes Jamming, Reboot, Blocker, and the Dark Animal rule trait at runtime", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-056", as: "werewolf" }] } });
    await s.ready();

    for (const keyword of ["Jamming", "Reboot", "Blocker"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("werewolf"), keyword)).toBe(true);
    }
    expect(observe(s.engine).hasEffectiveTrait(s.perm("werewolf"), "Dark Animal")).toBe(true);
  });

  it("uses both the Cerberusmon name route and the level 4 TS route", async () => {
    const named = setupEngine({
      0: {
        battleArea: [{ card: "BT1-039", as: "cerberusmon" }],
        hand: [{ card: "BT26-056", as: "werewolf" }],
        deck: ["BT1-001"],
      },
    });
    named.state.memory = 1;
    await named.ready();
    expect(
      named.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: named.perm("cerberusmon").permanentId,
        instanceId: named.inst("werewolf").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => named.perm("cerberusmon").topCard.cardId === "BT26-056");
    expect(named.state.memory).toBe(0);

    const trait = setupEngine({
      0: {
        battleArea: [{ card: "BT26-021", as: "tsBase" }],
        hand: [{ card: "BT26-056", as: "werewolf" }],
        deck: ["BT1-001"],
      },
    });
    trait.state.memory = 3;
    await trait.ready();
    expect(
      trait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: trait.perm("tsBase").permanentId,
        instanceId: trait.inst("werewolf").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => trait.perm("tsBase").topCard.cardId === "BT26-056");
    expect(trait.state.memory).toBe(0);
  });

  it("uses Inferno Divide by mandatorily trashing a hand card before De-Digivolve 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-071", as: "ts" }],
          hand: [
            { card: "BT26-056", as: "infernoDivide" },
            { card: "BT1-001", as: "handTrash" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT26-060", as: "target", under: ["BT26-059", "BT26-058", "BT26-057", "BT26-055"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("infernoDivide").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("waives the black Option requirement only with a TS card", async () => {
    const withoutTs = setupEngine({ 0: { hand: [{ card: "BT26-056", as: "infernoDivide" }] } });
    withoutTs.state.memory = 3;
    await withoutTs.ready();
    expect(
      withoutTs.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withoutTs.inst("infernoDivide").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withTs = setupEngine({
      0: {
        battleArea: [{ card: "BT26-021", as: "tsSource" }],
        hand: [{ card: "BT26-056", as: "infernoDivide" }],
      },
    });
    withTs.state.memory = 3;
    await withTs.ready();
    expect(
      withTs.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withTs.inst("infernoDivide").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => withTs.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-056"));
  });

  it("Q7059: uses Inferno Divide with an empty hand and still De-Digivolves 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-071", as: "ts" }],
          hand: [{ card: "BT26-056", as: "infernoDivide" }],
        },
        1: { battleArea: [{ card: "BT26-060", as: "target", under: ["BT26-059", "BT26-058", "BT26-057"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("infernoDivide").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
