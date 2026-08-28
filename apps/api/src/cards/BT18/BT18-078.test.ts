import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT18-078.js";

describe("BT18-078 Duskmon", () => {
  it.each([
    [EffectTiming.OnPlay, "On Play", "BT1-032"],
    [EffectTiming.WhenDigivolving, "When Digivolving", "BT1-032"],
    [EffectTiming.OnPlay, "On Play", "BT1-086"],
    [EffectTiming.WhenDigivolving, "When Digivolving", "BT1-086"],
  ])("changes one opposing Digimon or Tamer's original color on %s", async (timing, label, targetCard) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: targetCard, as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const target = s.perm("target");

    // The production target-selection path chooses exactly one opponent permanent.
    await advance(s.engine).fire(timing, s.perm("duskmon"));
    await s.ready();

    expect(observe(s.engine).effectiveColors(target), label).toEqual(["Red"]);
    expect(observe(s.engine).effectiveColors(target)).not.toContain("Blue");

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["Blue"]);
  });

  it("may digivolve a chosen Digimon or Tamer into a level 4 Hybrid from trash for one less memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-094", as: "koichi" },
            { card: "BT18-078", as: "duskmon" },
          ],
          trash: ["BT1-032", "BT18-077", "BT18-076"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    const firing = advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("duskmon"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    const targetCard = s.state.players[0]!.trash.find((card) => card.cardId === "BT18-077")!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [targetCard.instanceId] },
      }),
    ).toEqual({ ok: true });
    await firing;
    await s.ready();

    expect(s.perm("koichi").topCard?.cardId).toBe("BT18-077");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-032", "BT18-076"]);
  });

  it("does not digivolve when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-078", as: "duskmon" },
            { card: "BT18-094", as: "koichi" },
          ],
          trash: ["BT18-077"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("duskmon"));
    await s.ready();

    expect(s.perm("koichi").topCard?.cardId).toBe("BT18-094");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT18-077"]);
  });

  it("inherits an optional deletion effect that plays a Tamer costing 4 or less from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-079", under: ["BT18-078"], as: "host" }],
          trash: ["BT18-094"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await s.ready();

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT18-094")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT18-094")).toBe(false);
  });

  it("keeps the complete compiled contract", () => {
    const compiled = runtimeCompiledCard("BT18-078")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Koichi Kimura"], cost: 2, isAlternate: true },
      { names: ["Velgrmon"], cost: 1, isAlternate: true },
    ]);
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking" });
    expect(compiled.effects[3]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });
});
