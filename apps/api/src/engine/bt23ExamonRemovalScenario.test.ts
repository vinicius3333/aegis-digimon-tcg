import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("BT23 Examon removal arenas (Discord 1556039867106983976)", () => {
  it("returns Examon to deck bottom and replays both EX13 Lv.5 sources through Partition", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["Activate this triggered effect?"],
      },
    );
    layDevScenario("arena-bt23-examon-partition-return", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-examon-imperialdramon",
          instanceId: "dev-examon-fighter",
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "AD1-024"),
      );
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
        "EX13-021",
        "EX13-041",
      ]);
      expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT23-047");
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["EX13-008", "EX13-018"]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("wins a battle during the end-turn DNA attack and performs two Piercing checks", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: ["dev-perm-1-examon-victim"],
      },
    );
    layDevScenario("arena-bt23-examon-piercing-end-turn", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "attackEnded") &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT23-047"]);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
      expect(s.events.find((event) => event.kind === "attackDeclared")).toMatchObject({
        attackerCardId: "BT23-047",
        target: { kind: "permanent", permanentId: "dev-perm-1-examon-victim" },
      });
      // The scenario's Digi-Egg deck makes the next breeding phase interactive.
      await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
