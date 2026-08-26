import { EffectTiming, digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-012.js";

describe("BT11-012 Shoutmon X3", () => {
  it("matches the catalog and publishes the complete three-slot recipe and IR", () => {
    expect(getCardDefinition("BT11-012")).toMatchObject({
      cardId: "BT11-012",
      nameEn: "Shoutmon X3",
      colors: ["Red", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 6000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Composite", "Xros Heart"],
    });
    const recipe = [
      {
        materials: [{ names: ["Shoutmon"] }, { names: ["Ballistamon"] }, { names: ["Dorulumon"] }],
        count: 2,
      },
    ];
    expect(compiled.digiXrosRequirement).toEqual(recipe);
    expect(digiXrosRequirementFor("BT11-012")).toEqual(recipe);
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", keywords: [{ keyword: "MaterialSave", amount: 2 }] },
        { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", optional: true, abortOnDecline: true }] },
        { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3 }] },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("DigiXroses with all three distinct materials for a total cost of 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-012", as: "source" },
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("shoutmon").instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-012"));

    const x3 = s.state.players[0]!.battleArea[0]!;
    expect(x3.stack.map(({ cardId }) => cardId).sort()).toEqual(["BT10-008", "BT10-034", "BT10-049"]);
    expect(s.state.memory).toBe(6);
  });

  it("reveals three and adds as many eligible cards as possible up to two (Q2056)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-012", as: "source" }],
          deck: ["BT1-009", "BT10-008", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand[0]?.cardId).toBe("BT10-008");
    const x3 = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-012")!;
    expect(observe(s.engine).keywordAmount(x3, "MaterialSave")).toBe(2);
  });

  it("may delete itself at start of turn to gain 1 memory (Q2057)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-012", as: "x3" }] } }, { autoAcceptOptional: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("x3"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT11-012")).toBe(true);
  });

  it("may refuse the start-of-turn deletion cost (Q2057)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-012", as: "x3" }] } }, { autoAcceptOptional: false });
    s.state.memory = 0;

    const resolution = advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("x3"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const prompt = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("Material Save places exactly 2 specified sources under one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-085", as: "tamer" },
            { card: "BT11-012", as: "x3", under: ["BT10-008", "BT10-049", "BT10-034"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("x3").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.perm("tamer").stack).toHaveLength(2);
    expect(s.perm("tamer").stack.every(({ cardId }) => ["BT10-008", "BT10-034", "BT10-049"].includes(cardId))).toBe(
      true,
    );
  });
});
