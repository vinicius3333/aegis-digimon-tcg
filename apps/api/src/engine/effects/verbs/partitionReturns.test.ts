import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../../cards/index.js";
import { advance } from "../../testkit/advance.js";
import { setupEngine, settle } from "../../testkit/harness.js";

// A real Shakkoumon DNA effect reaches whole-permanent security placement.
async function placeHolderInSecurity(s: ReturnType<typeof setupEngine>, holderId: string): Promise<void> {
  const black = s.putOnBoard(1, "BT10-061");
  const yellow = s.putOnBoard(1, "BT10-035");
  const shakkoumon = s.give(1, Zone.Hand, "BT16-063");
  for (let n = 0; n < 7; n += 1) s.give(1, Zone.Security, "BT1-009");
  s.state.turnSeat = 1;
  expect(
    s.engine.applyIntent(1, {
      type: "dnaDigivolve",
      materialPermanentIds: [black.permanentId, yellow.permanentId],
      instanceId: shakkoumon.instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.security.some(({ instanceId }) => instanceId === holderId) &&
      s.state.pendingDecision === undefined,
  );
}

describe("Partition on non-deletion removal (Discord 1556039867106983976)", () => {
  it.each(["hand", "deckTop", "deckBottom", "security"] as const)(
    "plays both sources before the holder leaves for %s",
    async (destination) => {
      const replayHolderPresent: boolean[] = [];
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT23-047", as: "examon", under: ["BT1-076", "BT1-038"] }] } },
        {
          autoSelectCards: true,
          autoChooseOption: true,
          onEvent(event) {
            if (event.kind === "cardPlayed" && event.seat === 0) {
              replayHolderPresent.push(
                s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT23-047"),
              );
            }
          },
        },
      );
      await s.ready();
      const holderId = s.perm("examon").topCard.instanceId;
      const sourceIds = s.perm("examon").stack.map(({ instanceId }) => instanceId);
      const beforeMemory = s.state.memory;
      advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
      try {
        if (destination === "hand") await advance(s.engine).verb.returnToHand([holderId]);
        else if (destination === "security") {
          await placeHolderInSecurity(s, holderId);
        } else await advance(s.engine).verb.returnToDeck([holderId], { toTop: destination === "deckTop" });
      } finally {
        advance(s.engine).verb.leaveEffectResolution();
      }
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(sourceIds.sort());
      const zone = destination === "hand" ? "hand" : destination === "security" ? "security" : "deck";
      expect(s.state.players[0]![zone].map(({ instanceId }) => instanceId)).toEqual([holderId]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.memory).toBe(beforeMemory);
      expect(replayHolderPresent).toEqual([true, true]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each(["hand", "deck"] as const)(
    "does not chase a replaced holder into another stack for %s",
    async (destination) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT23-047", as: "examon", under: ["BT1-076", "BT1-038"] },
              { card: "BT1-009", as: "watcher" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      const holderId = s.perm("examon").topCard.instanceId;
      const holderPermanentId = s.perm("examon").permanentId;
      const watcherId = s.perm("watcher").permanentId;
      // Inject a nested replacement at the production future-event seam. The original return
      // must keep its selected permanent identity even when a Partition play moves the holder.
      advance(s.engine).ledgers.subTriggers.subscribe({
        event: "whenPlayed",
        sourcePermanentId: watcherId,
        once: true,
        description: "test: replace Partition holder during source replay",
        run: async (ctx) => {
          ctx.fx.relocatePermanent(watcherId, holderPermanentId, {
            belowTop: false,
            faceUp: true,
            shedOwnCards: false,
          });
        },
      });
      advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
      try {
        if (destination === "hand") await advance(s.engine).verb.returnToHand([holderId]);
        else await advance(s.engine).verb.returnToDeck([holderId]);
      } finally {
        advance(s.engine).verb.leaveEffectResolution();
      }
      expect(s.perm("watcher").stack.map(({ instanceId }) => instanceId)).toContain(holderId);
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([
    {
      holder: "BT1-080",
      sources: ["BT1-037", "BT1-069", "AD1-011"],
      replay: ["BT1-037", "BT1-069"],
      label: "inherited",
    },
    { holder: "AD1-025", sources: ["BT1-025", "BT1-044"], replay: ["BT1-025", "BT1-044"], label: "named" },
  ])("replays the correct materials for a $label Partition spec", async ({ holder, sources, replay }) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: holder, as: "holder", under: sources }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    try {
      await advance(s.engine).verb.returnToDeck([s.perm("holder").topCard.instanceId]);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(replay.sort());
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["own-effect", "missing-source", "decline"] as const)("does not replay sources for %s", async (path) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-047", as: "examon", under: path === "missing-source" ? ["BT1-038"] : ["BT1-076", "BT1-038"] },
          ],
        },
      },
      { autoSelectCards: true, declinePrompts: path === "decline" ? ["Partition"] : [] },
    );
    await s.ready();
    const holderId = s.perm("examon").topCard.instanceId;
    const sourceIds = s.perm("examon").stack.map(({ instanceId }) => instanceId);
    advance(s.engine).verb.enterEffectResolution(path === "own-effect" ? 0 : 1, ["Option"]);
    try {
      await advance(s.engine).verb.returnToDeck([holderId]);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([holderId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(sourceIds);
    expect(s.decisions.some(({ req }) => req.promptText.includes("Partition"))).toBe(path === "decline");
  });

  it("Q7274: a simultaneous prevention preserves the holder and still plays its sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-024", as: "slayer" },
            { card: "BT23-047", as: "examon", under: ["BT1-076", "BT1-038"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const holderId = s.perm("examon").topCard.instanceId;
    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    try {
      await advance(s.engine).verb.returnToHand([holderId]);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      ["EX13-024", "BT23-047", "BT1-076", "BT1-038"].sort(),
    );
    expect(s.perm("examon").stack).toHaveLength(0);
    expect(s.perm("slayer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
