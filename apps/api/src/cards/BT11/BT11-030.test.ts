import { compiledEffects, digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { universalNameAliasesFor } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-030.js";

describe("BT11-030 MetalGreymon + Cyber Launcher", () => {
  it("matches the catalog and publishes every complete structural contract", () => {
    expect(getCardDefinition("BT11-030")).toMatchObject({
      cardId: "BT11-030",
      nameEn: "MetalGreymon + Cyber Launcher",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 2 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Enhancement", "Blue Flare"],
    });
    expect(digiXrosRequirementFor("BT11-030")).toEqual([
      { materials: [{ names: ["MetalGreymon"] }, { names: ["Cyberdramon"] }], count: 2 },
    ]);
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Rule", keywords: [{ keyword: "Armor Purge" }] },
        { trigger: "OnPlay", actions: [{ kind: "PlaceUnder" }, { kind: "Return" }, { kind: "Return" }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "PlaceUnder" }, { kind: "Return" }, { kind: "Return" }] },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-030"]).toEqual(compiled);
    expect(compiledEffects["BT10-012"]?.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }],
    });
  });

  it("publishes universal aliases for DigiXros material matching and places sources at the bottom", () => {
    expect(universalNameAliasesFor("BT11-030")).toEqual(["MetalGreymon", "Cyberdramon"]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          grant: "name",
          tokens: ["MetalGreymon", "Cyberdramon"],
        },
      ],
    });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
  });

  it("supports both evolution routes and their exact costs", async () => {
    for (const [base, cost] of [
      ["BT11-027", 4],
      ["BT11-028", 2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT11-030", as: "launcher" }] },
      });
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("launcher").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-030");
      expect(s.state.memory).toBe(6 - cost);
    }
  });

  it("DigiXroses distinct MetalGreymon and Cyberdramon slots for cost 4", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-030", as: "launcher" },
          { card: "BT10-024", as: "metal" },
          { card: "BT10-025", as: "cyber" },
        ],
      },
    });
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("launcher").instanceId,
        digiXros: { materialInstanceIds: [s.inst("metal").instanceId, s.inst("cyber").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(2);
  });
  it("accepts BT11-030 copies from hand through their universal name aliases", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-030", as: "launcher" },
          { card: "BT11-030", as: "metalAlias" },
          { card: "BT11-030", as: "cyberAlias" },
        ],
      },
    });
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("launcher").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("metalAlias").instanceId, s.inst("cyberAlias").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(2);
  });

  it("is also treated as MetalGreymon and Cyberdramon and has Armor Purge", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-030", as: "launcher" }] } });
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("launcher"))).toEqual([
      "metalgreymon + cyber launcher",
      "metalgreymon",
      "cyberdramon",
    ]);
    expect(observe(s.engine).hasKeyword(s.perm("launcher"), "Armor Purge")).toBe(true);
  });

  it("another copy placed from under a Tamer counts as Cyberdramon and enables the level 4 return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-095", as: "tamer", under: [{ card: "BT11-030", as: "material" }] }],
          hand: [{ card: "BT11-030", as: "launcher" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "level4" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetInstanceId = s.perm("level4").topCard!.instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("launcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === targetInstanceId));

    const launcher = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("launcher").instanceId,
    )!;
    expect(launcher.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
  });

  it("places Blue Flare from hand, always returns level 3, and leaves level 4 without Cyberdramon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-030", as: "launcher" },
            { card: "BT10-019", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT11-024", as: "level3" },
            { card: "AD1-001", as: "level4" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const level3Id = s.inst("level3").instanceId;
    const level4Id = s.inst("level4").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("launcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some(({ instanceId }) => instanceId === level3Id));

    const launcher = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("launcher").instanceId,
    )!;
    expect(launcher.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).not.toContain(level4Id);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(level4Id);
  });

  it("uses Armor Purge to survive deletion by trashing its top card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-030", as: "launcher", under: ["BT10-019"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("launcher").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("launcher").topCard.cardId).toBe("BT10-019");
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT11-030")).toBe(true);
  });
});
