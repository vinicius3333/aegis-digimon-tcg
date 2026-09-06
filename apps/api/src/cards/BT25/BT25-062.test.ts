import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_062 } from "./BT25-062.js";
import "./BT25-066.js";
import "../index.js";

describe("BT25-062 Kokuwamon", () => {
  it("matches the catalog identity, alternate evolution, start-phase effect, and inherited text", () => {
    expect(getCardDefinition("BT25-062")).toMatchObject({
      nameEn: "Kokuwamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Machine", "Iliad", "TS"],
      effectText: expect.stringContaining("If you have 4 or less memory"),
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
      dualEffect: "Kokuwamon",
    });
    const effect = BT25_062.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Machine", "Cyborg", "TS"], match: "trait" }],
      },
    });
    const inherited = BT25_062.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("at the exact Q6364 boundary free-digivolves into a matching hand Digimon and rejects a near trait", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-062", as: "koku" }],
          hand: [
            { card: "BT25-061", as: "nearTrait" },
            { card: "BT25-066", as: "machineTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("machineTarget").instanceId);
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("koku"));
    await settle(() => s.perm("koku").topCard.instanceId === s.inst("machineTarget").instanceId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("koku").stack.map((card) => card.cardId)).toEqual(["BT25-062"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-061"]);
    expect(observe(s.engine).hasKeyword(s.perm("koku"), "Blocker")).toBe(true);
    expect(s.perm("koku").currentDP).toBe(6000); // Guardromon 5000 + inherited Kokuwamon +1000
  });

  it.each([
    ["Machine", "BT25-066"],
    ["Cyborg", "BT14-060"],
    ["TS", "BT25-068"],
  ] as const)("free-digivolves into a distinct %s trait candidate at memory 4", async (_trait, targetCard) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-062", as: "koku" }], hand: [{ card: targetCard, as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("koku"));
    await settle(() => s.perm("koku").topCard?.instanceId === s.inst("target").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.perm("koku").topCard.cardId).toBe(targetCard);
  });

  it("does not activate at memory 5, and declining the may effect leaves the stack and hand unchanged", async () => {
    const above = setupEngine({
      0: {
        battleArea: [{ card: "BT25-062", as: "koku" }],
        hand: [{ card: "BT25-066", as: "target" }],
      },
    });
    above.state.memory = 5;
    await advance(above.engine).fire(EffectTiming.OnStartMainPhase, above.perm("koku"));
    expect(above.perm("koku").topCard.cardId).toBe("BT25-062");
    expect(above.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-066"]);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT25-062", as: "koku" }],
        hand: [{ card: "BT25-066", as: "target" }],
      },
    });
    opponentTurn.state.memory = 4;
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).fire(EffectTiming.OnStartMainPhase, opponentTurn.perm("koku"));
    expect(opponentTurn.perm("koku").topCard.cardId).toBe("BT25-062");
    expect(opponentTurn.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-066"]);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-062", as: "koku" }],
          hand: [{ card: "BT25-066", as: "target" }],
        },
      },
      { autoAcceptOptional: false },
    );
    declined.state.memory = 4;
    const pending = advance(declined.engine).fire(EffectTiming.OnStartMainPhase, declined.perm("koku"));
    await settle(() => declined.state.pendingDecision?.kind === "optional");
    const decision = declined.state.pendingDecision!;
    expect(
      declined.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await pending;
    expect(declined.perm("koku").topCard.cardId).toBe("BT25-062");
    expect(declined.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-066"]);
  });

  it("reaches Kokuwamon through its legal TS level-2 evolution and keeps the inherited DP through the next evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-005", as: "tsBase" }],
          hand: [
            { card: "BT25-062", as: "koku" },
            { card: "BT25-066", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("koku").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("koku").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("tsBase").stack.map((card) => card.cardId)).toEqual(["BT25-005"]);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tsBase"));
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("target").instanceId);
    expect(s.perm("tsBase").stack.map((card) => card.cardId)).toEqual(["BT25-005", "BT25-062"]);
    expect(s.perm("tsBase").currentDP).toBe(6000);
  });
});
