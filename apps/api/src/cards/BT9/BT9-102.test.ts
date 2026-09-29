import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT9-102.js";
import "./BT9-102.js";
import "../BT19/BT19-065.js";
describe("BT9-102 Attack of the Heavy Mobile Digimon!", () => {
  it("matches catalog values and all-Machine grant and security IR", () => {
    expect(getCardDefinition("BT9-102")).toMatchObject({
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 0,
      securityEffectText:
        "[Security] You may trash 1 Digimon card with [Cyborg] or [Machine] in its traits in your hand to delete 1 of your opponent’s Digimon whose play cost is less than or equal to the trashed card’s play cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Rush" },
              duration: "forTheTurn",
              optional: true,
              includeLaterEntrants: true,
              target: { count: "all", filter: { levels: [6], traits: ["Machine"] } },
            },
            {
              kind: "GrantStatic",
              grant: "effects",
              tokens: ["OnPlayBlitzIfHasDigivolutionCard"],
              includeLaterEntrants: true,
              target: { count: "all", filter: { levels: [6], traits: ["Machine"] } },
            },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [
            {
              kind: "Delete",
              optional: true,
              cost: {
                kind: "trash",
                target: { filter: { kind: ["Digimon"] }, count: 1 },
                bindResultAs: "trashedSecurityCard",
              },
              target: {
                filter: {
                  kind: ["Digimon"],
                  relativeTo: { attr: "playCost", op: "lte", selectionRef: "trashedSecurityCard" },
                },
              },
            },
          ],
        },
      ],
    });
    const rush = compiled.effects.find((effect) => effect.trigger === "Main")!.actions[0]!;
    expect(rush).not.toHaveProperty("playerWide");
    expect(rush).toMatchObject({ kind: "GainKeyword", includeLaterEntrants: true });
  });

  it("installs the Rush effect by trashing a hand card", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-029"], hand: [{ card: "BT9-102", as: "option" }, "BT9-030"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT9-102"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "BT9-102")).toBe(true);
  });
});

describe("BT9-102 Attack of the Heavy Mobile Digimon! — KB Q&A rulings", () => {
  const digiXrosMaterials = ["BT3-059", "ST5-05", "BT3-067", "BT6-012", "BT2-060"];

  it("also gives <Rush> and the <Blitz> [On Play] to level 6 [Machine] Digimon played or digivolved later that turn (Q1907)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-022", as: "digivolveBase", enteredThisTurn: true }],
          hand: [
            { card: "BT9-102", as: "option" },
            { card: "BT9-029", as: "fodder" },
            { card: "BT9-029", as: "playedMachine" },
            { card: "BT9-029", as: "digivolvedMachine" },
            { card: "BT9-030", as: "playedNonMachine" },
            { card: "BT19-065", as: "xrosMachine" },
            ...digiXrosMaterials.map((card, index) => ({ card, as: `material${index}` })),
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "xrosDeleteTarget" }],
          security: ["BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declineDigiXros: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("fodder").instanceId, s.perm("xrosDeleteTarget").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT9-102"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("xrosMachine").instanceId,
        digiXros: { materialInstanceIds: digiXrosMaterials.map((_, index) => s.inst(`material${index}`).instanceId) },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("xrosMachine").stack).toHaveLength(digiXrosMaterials.length);

    for (const alias of ["playedMachine", "playedNonMachine"]) {
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined);
    }
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("digivolveBase").permanentId,
        instanceId: s.inst("digivolvedMachine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    const view = observe(s.engine);
    expect(view.hasKeyword(s.perm("playedMachine"), "Rush")).toBe(true);
    expect(view.hasKeyword(s.perm("digivolvedMachine"), "Rush")).toBe(true);
    expect(view.hasKeyword(s.perm("playedNonMachine"), "Rush")).toBe(false);
    expect(view.hasKeyword(s.perm("xrosMachine"), "Rush")).toBe(true);
    expect(view.hasKeyword(s.perm("xrosMachine"), "Blitz")).toBe(true);
    expect(view.hasKeyword(s.perm("playedMachine"), "Blitz")).toBe(false);
    expect(view.hasKeyword(s.perm("playedNonMachine"), "Blitz")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("playedNonMachine").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("digivolvedMachine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
