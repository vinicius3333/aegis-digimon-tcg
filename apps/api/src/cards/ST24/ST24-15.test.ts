import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-15 DNA Charge", () => {
  it("preserves the DATA SQUAD use requirement, Main placement, start-phase cost, and Security activation", () => {
    const card = runtimeCompiledCard("ST24-15");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] },
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon", "Tamer"],
                playCostLte: 4,
                nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
              },
              count: 1,
            },
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          { kind: "Draw", amount: 1, cost: { kind: "place", underFilter: { controller: "mine", kind: ["Tamer"] } } },
          { kind: "GainMemory", amount: 1 },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("places itself in the battle area after the optional DATA SQUAD play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-13", as: "useRequirement" }],
          hand: [
            { card: "ST24-15", as: "dnaCharge" },
            { card: "ST24-02", as: "declinedCard" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const optionId = s.inst("dnaCharge").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: optionId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      expect(
        s.engine.applyIntent(prompt.seat, {
          type: "respondDecision",
          decisionId: prompt.req.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("declinedCard").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });
});
