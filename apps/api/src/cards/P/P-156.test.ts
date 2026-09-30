import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-156.js";

describe("P-156 Future Potential!", () => {
  it("binds a Tamer and plays only a low-cost Digimon sharing one of its colors", () => {
    const main = runtimeCompiledCard("P-156")!.effects.find((effect) => effect.trigger === "Main")!;

    expect(main.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "chosenTamer", filter: { kind: ["Tamer"] } } },
      {
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
        target: {
          filter: {
            kind: ["Digimon"],
            playCostLte: 3,
            sameColorAsSelectionRef: "chosenTamer",
          },
        },
      },
    ]);
  });

  it("waives color with a Tamer and preserves the complete Security sequence", () => {
    const compiled = runtimeCompiledCard("P-156")!;
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave", filter: { kind: ["Tamer"] } },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", from: ["hand"], optional: true },
      { kind: "AddToHandSelf" },
    ]);
  });

  it("plays a Tamer from hand without cost and returns itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-156", as: "option" }], hand: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("ignores its color requirement while a Tamer is present", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "P-156", as: "option" }], battleArea: [{ card: "BT1-085", as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    s.state.phase = Phase.Main;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays a same-color Digimon costing at most 3 from hand without an additional cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-156", as: "option" },
            { card: "BT1-009", as: "redRookie" },
            { card: "BT1-047", as: "yellowRookie" },
            { card: "BT1-017", as: "overCost" },
          ],
          battleArea: [{ card: "BT1-085", as: "redTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("redRookie").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("redRookie").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yellowRookie").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("overCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(8);
  });
});

describe("P-156 Future Potential! — KB Q&A rulings", () => {
  async function useWithTamer(tamer: string, hand: string[], pick?: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-156", as: "option" }, ...hand.map((card) => ({ card, as: card }))],
          battleArea: [{ card: tamer, as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    if (pick !== undefined) preferred.push(s.inst(pick).instanceId);
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    await s.ready();
    const handIds = new Map(hand.map((card) => [s.inst(card).instanceId, card]));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "P-156"));
    await settle(() => s.state.pendingDecision === undefined);
    const offered = s.decisions
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])
      .filter((instanceId) => handIds.has(instanceId))
      .map((instanceId) => handIds.get(instanceId)!);
    const played = s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).filter((cardId) => cardId !== tamer);
    return { offered: [...new Set(offered)].sort(), played };
  }

  it("treats a Digimon sharing at least one color with the chosen Tamer as the same color (Q4270)", async () => {
    const { offered } = await useWithTamer("BT1-085", ["BT1-009", "BT13-008", "BT1-047"]);
    expect(offered).toEqual(["BT1-009", "BT13-008"]);
  });

  it("plays a multicolor Digimon including red for a single-color red Tamer (Q4271)", async () => {
    const { played } = await useWithTamer("BT1-085", ["BT13-008", "BT1-047"], "BT13-008");
    expect(played).toEqual(["BT13-008"]);
  });

  it("plays a single-color red or blue Digimon for a red and blue Tamer (Q4272)", async () => {
    const { offered } = await useWithTamer("BT17-081", ["BT1-009", "BT1-027", "BT1-047"]);
    expect(offered).toEqual(["BT1-009", "BT1-027"]);
    for (const monoColor of ["BT1-009", "BT1-027"]) {
      const { played } = await useWithTamer("BT17-081", [monoColor]);
      expect(played).toEqual([monoColor]);
    }
  });
});
