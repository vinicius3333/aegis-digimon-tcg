import { expect, it } from "vitest";
import { compiled as original } from "../cards/BT1/BT1-010.js";
import { registerIrCard } from "./effects/interpreter.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

it.each([false, true])(
  "BT19-087 preserves the optional processing cost during effect DigiXros (accept=%s)",
  async (accept) => {
    // Isolate the effect-play caller; Nene and Shoutmon X4 retain their real compiled modules.
    registerIrCard("BT1-010", {
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { controller: "mine", cardId: "BT10-009" }, count: 1, from: ["hand"] },
              payCost: false,
              allowDigiXros: true,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    try {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-087", as: "nene" }],
            hand: [
              { card: "BT1-010", as: "caller" },
              { card: "BT10-009", as: "played" },
            ],
            trash: [{ card: "BT10-008", as: "material" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 9;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("caller").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(s.state.pendingDecision?.kind).toBe("optional");
      const decision = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === decision.decisionId)?.req.sourceCardId).toBe("BT19-087");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT10-009"),
      );
      const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT10-009");
      expect(played).toBeDefined();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.perm("nene").isSuspended).toBe(accept);
      expect(played!.stack.some(({ instanceId }) => instanceId === s.inst("material").instanceId)).toBe(accept);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("material").instanceId)).toBe(
        !accept,
      );
    } finally {
      registerIrCard("BT1-010", original);
    }
  },
);
