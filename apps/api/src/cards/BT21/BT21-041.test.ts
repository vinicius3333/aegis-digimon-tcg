import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-041.js";
import "../index.js";

describe("BT21-041 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves the Appmon link requirement and linked Security Digimon DP reduction", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    const linkedTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn" && effect.isLinked);
    expect(linkedTurn?.actions).toEqual([
      {
        kind: "ModifySecurityDP",
        controller: "opponent",
        amount: -3000,
        duration: "permanent",
      },
    ]);
  });

  it("defers the free Security play through the battle-ended event", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityBattleEnded",
      once: true,
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
    });
  });

  it("marks the Security play at the printed end-of-battle timing", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
        },
      ],
    });
  });

  it("plays from Security after the battle finishes in a real security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-041", as: "calendamon" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-041"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    const checkedIndex = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT21-041",
    );
    const playedIndex = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-041");
    const checked = s.events[checkedIndex] as { battle?: unknown } | undefined;
    expect(checkedIndex).toBeGreaterThanOrEqual(0);
    expect(checked?.battle).toBeDefined();
    expect(playedIndex).toBeGreaterThan(checkedIndex);
  });

  it("links to an Appmon for 1, grants 2000 DP, and reduces only opposing Security Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-018", as: "host" }],
        hand: [{ card: "BT21-041", as: "calendamon" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 2;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("calendamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.cardId === "BT21-041"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("makes a real Security Digimon battle survivable only with the linked reduction", async () => {
    for (const linked of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-018", as: "host" }],
            hand: [{ card: "BT21-041", as: "calendamon" }],
          },
          1: { security: [{ card: "BT1-059", as: "securityDigimon" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 2;
      const hostId = s.perm("host").permanentId;
      await s.ready();
      if (linked) {
        expect(
          s.engine.applyIntent(0, {
            type: "linkCard",
            instanceId: s.inst("calendamon").instanceId,
            targetPermanentId: hostId,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.perm("host").linked.length === 1 && s.state.pendingDecision === undefined);
      }
      expect(s.perm("host").currentDP).toBe(linked ? 8000 : 6000);
      expect(observe(s.engine).securityDp(1)).toBe(linked ? -3000 : 0);
      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking(),
      );
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-059");
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(linked);
      expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-018")).toBe(!linked);
    }
  });

  it("resolves a non-Digimon Security effect while the linked DP modifier is active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host" }],
          hand: [{ card: "BT21-041", as: "calendamon" }],
        },
        1: { security: [{ card: "ST1-16", as: "option" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("calendamon").instanceId,
        targetPermanentId: hostId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.cardId === "BT21-041"));
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-018")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST1-16")).toBe(true);
  });

  it("does not reduce Security Digimon on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-018", as: "host", linked: ["BT21-041"] }] },
      1: { security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(0);
  });

  it("rejects linking to a non-Appmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonAppmon" }],
        hand: [{ card: "BT21-041", as: "calendamon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("calendamon").instanceId,
        targetPermanentId: s.perm("nonAppmon").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
  });

  it("evolves from a level-2 Appmon for 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "appmonEgg" },
        hand: [{ card: "BT21-041", as: "calendamon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("appmonEgg").permanentId,
        instanceId: s.inst("calendamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmonEgg").topCard.cardId === "BT21-041");

    expect(s.state.memory).toBe(1);
  });
});
