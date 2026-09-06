import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { createCardStateLookup } from "../effects/context.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/BT20/index.js";
import "../../cards/EX5/EX5-053.js";
import "../../cards/EX5/EX5-009.js";

describe("checked cards outside the security stack", () => {
  it("plays only the checked Deva while another Deva remains in security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-046", as: "attacker" }] },
        1: {
          battleArea: [{ card: "EX5-053", as: "baihumon" }],
          security: [
            { card: "EX5-009", as: "checked" },
            { card: "EX5-010", as: "remaining" },
          ],
          deck: ["BT20-010"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const checkedId = s.inst("checked").instanceId;
    const remainingId = s.inst("remaining").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked", resolution: "effect" }));
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([remainingId]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === checkedId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === checkedId)).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT20-010"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not substitute a remaining Deva for a checked non-Deva", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-046", as: "attacker" }] },
        1: {
          battleArea: [{ card: "EX5-053", as: "baihumon" }],
          security: ["BT1-015", { card: "EX5-009", as: "remaining" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const remainingId = s.inst("remaining").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked", resolution: "battle" }));
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([remainingId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("self-play during Security creates exactly one rule removal, without an effect-removal event", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-046", as: "attacker" }] },
      1: { security: [{ card: "BT20-085", as: "shoto" }] },
    });
    const shotoId = s.inst("shoto").instanceId;
    let removals = 0;
    let effectRemovals = 0;
    for (const event of ["whenSecurityRemoved", "whenEffectRemovesFromSecurity"] as const) {
      advance(s.engine).ledgers.subTriggers.subscribe({
        event,
        sourcePermanentId: s.perm("attacker").permanentId,
        once: false,
        description: `checked-card ${event}`,
        run: async () => {
          if (event === "whenSecurityRemoved") removals += 1;
          else effectRemovals += 1;
        },
      });
    }
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked", resolution: "effect" }));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([shotoId]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(removals).toBe(1);
    expect(effectRemovals).toBe(0);
  });

  it("activates a persistent removal watcher again on the next attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-046", as: "first" },
          { card: "BT20-046", as: "second" },
        ],
      },
      1: { security: ["BT20-001", "BT20-001"] },
    });
    let removals = 0;
    // Synthetic watcher isolates window consumption from a card's printed once-per-turn limit.
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenSecurityRemoved",
      sourcePermanentId: s.perm("first").permanentId,
      once: false,
      description: "repeat check removal",
      run: async () => {
        removals += 1;
      },
    });
    for (const [index, alias] of ["first", "second"].entries()) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === index + 1);
      expect(removals).toBe(index + 1);
    }
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not trash a checked card that a pending effect placed under a permanent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-046", as: "attacker" }] },
      1: { security: [{ card: "BT20-001", as: "checked" }] },
    });
    const checkedId = s.inst("checked").instanceId;
    // The synthetic watcher drives the normal placement primitive during a public check.
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenSecurityRemoved",
      sourcePermanentId: s.perm("attacker").permanentId,
      once: false,
      description: "relocate checked card under attacker",
      run: async () => {
        expect(createCardStateLookup(s.state).isInSecurity?.(checkedId)).toBe(false);
        await advance(s.engine).verb.placeUnder(s.perm("attacker").permanentId, [checkedId]);
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([checkedId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
