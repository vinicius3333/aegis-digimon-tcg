import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("Discord 1555932429007593605: AD1 Adventure Tamers security arena", () => {
  it("runs two actual security checks through the turn loop and plays both checked instances", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-ad1-adventure-tamers-security", s.state, [BLUE_DECK, RED_DECK]);
    const checked = [...s.state.players[1]!.security];
    expect(checked.map((card) => card.cardId)).toEqual(["AD1-019", "AD1-022"]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const attackers = [...s.state.players[0]!.battleArea];
      for (const [index, attacker] of attackers.entries()) {
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: attacker.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.events.filter((event) => event.kind === "attackEnded").length === index + 1 &&
            s.state.pendingDecision === undefined,
        );
        expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
          checked[index]!.instanceId,
        );
        expect(s.state.players[1]!.security).toHaveLength(1 - index);
        expect(s.state.memory).toBe(3);
      }
      expect(s.events.filter((event) => event.kind === "securityRevealed")).toMatchObject([
        { revealedCardId: "AD1-019", hasSecurityEffect: true },
        { revealedCardId: "AD1-022", hasSecurityEffect: true },
      ]);
      expect(
        s.events
          .filter((event) => event.kind === "effectResolved" && event.timing === "Security")
          .map((event) => event.kind === "effectResolved" && event.sourceCardId),
      ).toEqual(["AD1-019", "AD1-022"]);
      expect(s.state.players[1]!.battleArea.every((permanent) => !permanent.isSuspended)).toBe(true);
      expect(s.state.players[1]!.trash).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.phase).toBe(Phase.Main);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it.each(["AD1-020", "AD1-021", "AD1-023"])("keeps %s's existing Security behavior working", async (cardId) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: cardId, as: "checked" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("checked").instanceId,
    );
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });
});
