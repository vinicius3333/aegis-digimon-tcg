import { expect, it } from "vitest";
import { type Action } from "@aegis/shared";
import "../cards/index.js";
import { registerIrCard, runtimeCompiledCard } from "./effects/interpreter.js";
import { setupEngine, settle } from "./testkit/harness.js";

// Test-only IR producer: current printed cards do not combine reveal play/use with
// an under-Tamer slot. Exercise the shared deferred-host contract through public play.
for (const route of ["play", "alternative-play", "useOption"] as const) {
  it(`preserves an under-Tamer destination when ${route} introduces its host later`, async () => {
    const originalSource = runtimeCompiledCard("BT1-010")!;
    const originalOption = runtimeCompiledCard("ST1-16")!;
    const introduce: Extract<Action, { kind: "RevealAdd" }>["add"][number] = {
      filter: { kind: route === "useOption" ? ["Option"] : ["Tamer"] },
      count: 1,
      to: route === "alternative-play" ? "hand" : route,
      ...(route === "alternative-play" ? { orDispositions: [{ to: "play" as const }] } : {}),
    };
    try {
      registerIrCard("ST1-16", {
        effects: [
          {
            trigger: "Main",
            actions: [
              {
                kind: "PlayWithoutCost",
                target: { filter: { kind: ["Tamer"] }, count: 1 },
                from: ["trash"],
                payCost: false,
              },
            ],
          },
        ],
        coverage: "full",
        residual: [],
      });
      registerIrCard("BT1-010", {
        effects: [
          {
            trigger: "OnPlay",
            actions: [
              {
                kind: "RevealAdd",
                revealCount: 2,
                add: [
                  introduce,
                  {
                    filter: { kind: ["Digimon"] },
                    count: 1,
                    to: "underTamer",
                    faceDown: true,
                    underFilter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
                  },
                ],
                rest: "deckBottom",
              },
            ],
          },
        ],
        coverage: "full",
        residual: [],
      });
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT1-010", as: "source" }],
            deck: [route === "useOption" ? "ST1-16" : "ST24-13", { card: "ST24-06", as: "saved" }],
            trash: route === "useOption" ? ["ST24-13"] : [],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          preferOptionIndex: route === "alternative-play" ? 1 : 0,
        },
      );
      s.state.memory = 20;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some(
            (p) => p.topCard.cardId === "ST24-13" && p.stack.some((c) => c.instanceId === s.inst("saved").instanceId),
          ) && !s.state.pendingDecision,
      );
      const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST24-13")!;
      expect(host.stack.find((c) => c.instanceId === s.inst("saved").instanceId)?.faceUp).toBe(false);
    } finally {
      registerIrCard("BT1-010", originalSource);
      registerIrCard("ST1-16", originalOption);
    }
  });
}
