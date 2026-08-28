import { EffectTiming, appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-033.js";

describe("BT23-033 Beautymon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-033")).toMatchObject({
      cardId: "BT23-033",
      nameEn: "Beautymon",
      colors: ["Yellow", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["Life"],
      types: ["Beauty"],
      linkDp: 4000,
      linkEffect:
        "[When Linking] Until your opponent's turn ends, their effects can't return this Digimon to hands or decks or affect it with ＜De-Digivolve＞ effects.",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 3",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
  it("links only a Link-capable level-4-or-lower card and still scales DP when Recovery is ineligible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-033", as: "beautymon" }],
          trash: [
            { card: "BT23-039", as: "linkCapable" },
            { card: "BT1-009", as: "noLink" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          deck: [{ card: "BT23-100", as: "mustRemainInDeck" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkId = s.inst("linkCapable").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beautymon"));

    expect(s.perm("beautymon").linked.some((card) => card.instanceId === linkId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("may link a level 4-or-lower card from trash or this Digimon's stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            hasLinkRequirement: true,
            levelComparison: { op: "lte", value: 4 },
          },
          count: 1,
        },
        from: ["trash", "digivolutionCards"],
        payCost: false,
        optional: true,
      });
      expect(action.recipient).toBeUndefined();
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 5 },
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -1000,
          duration: "untilOpponentTurnEnd",
          scaling: { per: 1, unit: "security", filter: { controller: "mine" } },
        },
      ],
    });
  });

  it("carries App Fusion, Link cost and linked return/de-digivolve protection", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Coordemon", "Consulmon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ cost: 3, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Restrict", restriction: "cannotReturnToHandOrDeck", duration: "untilOpponentTurnEnd" },
            {
              kind: "GrantStatic",
              grant: "protection",
              tokens: ["beDeDigivolved"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
    expect(appFusionCostFor("BT23-033", { topName: "Coordemon", linkedNames: ["Consulmon"] })).toBe(0);
    expect(appFusionCostFor("BT23-033", { topName: "Consulmon", linkedNames: ["Coordemon"] })).toBe(0);
  });

  it("at five security recovers first, then scales the DP loss from all six cards, per Q5281", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-033", as: "beautymon" }],
          trash: [{ card: "BT23-039", as: "link" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          deck: [{ card: "BT23-100", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beautymon"));
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("links onto an Appmon for 3, adds 4000 DP, and grants both linked protections", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT23-033", as: "beautymon" }] },
    });
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("beautymon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("beautymon").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 4000);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beReturned")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeDeDigivolved")).toBe(true);
  });
});
