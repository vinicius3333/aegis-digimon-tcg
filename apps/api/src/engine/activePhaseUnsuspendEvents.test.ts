import { EffectDuration, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";

describe("Active-phase unsuspend presentation", () => {
  it("announces all simultaneous own and Reboot transitions before reactions, excluding blocked and unchanged cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-032", as: "own", suspended: true }],
          deck: Array(12).fill("BT1-009"),
          eggDeck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT25-060", as: "reboot", suspended: true },
            { card: "BT4-070", as: "blocked", suspended: true },
            { card: "BT4-070", as: "unchanged" },
          ],
          deck: Array(12).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("blocked").permanentId,
      "unsuspend",
      EffectDuration.UntilEachTurnEnd,
    );
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined);
      const firstReaction = s.events.findIndex((event) => event.kind === "effectTriggered");
      const moved = s.events.flatMap((event, index) =>
        event.kind === "cardsMoved" && event.to === "unsuspended" ? [{ index, ids: event.instanceIds }] : [],
      );
      expect(moved.flatMap(({ ids }) => ids)).toEqual([s.perm("own").permanentId, s.perm("reboot").permanentId]);
      expect(firstReaction).toBeGreaterThan(moved.at(-1)!.index);
      expect(s.perm("blocked").isSuspended).toBe(true);
      expect(s.perm("unchanged").isSuspended).toBe(false);
      expect(s.perm("reboot").grantedKeywords).toContain("Blocker");
    } finally {
      s.engine.applyIntent(0, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("Discord 1555995840093360188: announces Veemon unsuspending before either Rina resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-023", as: "veemon", suspended: true },
            { card: "BT11-112", as: "bt11Rina" },
            { card: "EX13-069", as: "ex13Rina", suspended: true },
          ],
          deck: Array(12).fill("BT1-009"),
          eggDeck: ["BT1-001"],
          hand: ["EX13-019"],
        },
        1: { deck: Array(12).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["EX13-069"] },
    );
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined);
      const unsuspend = s.events.findIndex(
        (event) =>
          event.kind === "cardsMoved" &&
          event.to === "unsuspended" &&
          event.instanceIds.includes(s.perm("veemon").permanentId),
      );
      const rina = s.events.findIndex(
        (event) => event.kind === "effectTriggered" && ["BT11-112", "EX13-069"].includes(event.sourceCardId),
      );
      expect(unsuspend).toBeGreaterThan(-1);
      expect(rina).toBeGreaterThan(unsuspend);
      expect(s.perm("veemon").topCard.cardId).toBe("EX13-019");
      expect(s.perm("veemon").isSuspended).toBe(false);
      expect(s.perm("ex13Rina").isSuspended).toBe(true);
      const rinaMovements = s.events.filter(
        (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.perm("ex13Rina").permanentId),
      );
      expect(rinaMovements.map((event) => (event.kind === "cardsMoved" ? event.to : undefined))).toEqual([
        "unsuspended",
        "suspended",
      ]);
      expect(s.state.memory).toBe(6);
    } finally {
      s.engine.applyIntent(0, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it.each([0, 5])(
    "Discord 1555995840093360188: Rina reacts to the next turn's unsuspend, not Evade (Option starts at %i memory)",
    async (optionMemory) => {
      const preferences: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-029", as: "ulforce", under: ["BT11-023", "BT22-022", "EX13-022"] },
              { card: "EX13-069", as: "ex13Rina" },
            ],
            hand: [{ card: "BT11-112", as: "bt11Rina" }, "EX13-019"],
            deck: Array(12).fill("BT1-009"),
            eggDeck: ["BT1-001"],
          },
          1: {
            battleArea: [{ card: "BT6-084", as: "artsTarget" }, "ST12-12", "BT13-013"],
            hand: [{ card: "EX13-066", as: "option" }],
            deck: Array(12).fill("BT1-009"),
            eggDeck: ["BT1-001"],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          preferInstanceIds: preferences,
          preferTriggerKeys: ["EX13-069"],
        },
      );
      s.state.memory = 3;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bt11Rina").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("ulforce").grantedKeywords.includes("Evade") && s.state.pendingDecision === undefined);

      // Seed the opponent's following turn after the real On Play grant. The live
      // match used the Option at 0; 5 is the control where no turn passes afterward.
      s.state.turnSeat = 1;
      s.state.memory = optionMemory;
      s.state.isFirstPlayersFirstTurn = false;
      preferences.push(s.perm("artsTarget").topCard.instanceId);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(1);
        const start = s.events.length;
        expect(
          s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
        ).toEqual({ ok: true });
        await settle(() => s.events.slice(start).some((event) => event.kind === "evadePrompt"));
        expect(s.perm("ulforce").topCard.cardId).toBe("BT11-023");
        expect(s.perm("ulforce").stack).toHaveLength(0);
        expect(s.perm("artsTarget").topCard.cardId).toBe("EX13-066");
        expect(
          s.engine.applyIntent(0, { type: "respondEvade", permanentId: s.perm("ulforce").permanentId, accept: true }),
        ).toEqual({ ok: true });

        if (optionMemory === 0) {
          await settle(
            () => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding && s.state.pendingDecision === undefined,
          );
        } else {
          await settle(() => s.perm("ulforce").isSuspended && s.state.pendingDecision === undefined);
          await advance(s.engine).waitForMainPhase(1);
        }
        const crossed = optionMemory === 0;
        expect(s.state.turnSeat).toBe(crossed ? 0 : 1);
        expect(s.state.memory).toBe(crossed ? 6 : 0);
        expect(s.perm("ulforce").topCard.cardId).toBe(crossed ? "EX13-019" : "BT11-023");
        expect(s.perm("ulforce").isSuspended).toBe(!crossed);
        const sequence = s.events.slice(start).flatMap((event) => {
          if (event.kind === "turnEnded") return ["turnEnded"];
          if (
            event.kind === "cardsMoved" &&
            event.to === "unsuspended" &&
            event.instanceIds.includes(s.perm("ulforce").permanentId)
          )
            return ["unsuspend"];
          if (event.kind === "effectTriggered" && ["BT11-112", "EX13-069"].includes(event.sourceCardId))
            return [event.sourceCardId];
          return [];
        });
        expect(sequence).toEqual(crossed ? ["turnEnded", "unsuspend", "EX13-069", "BT11-112"] : []);
      } finally {
        s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "endPhase" });
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );
});
