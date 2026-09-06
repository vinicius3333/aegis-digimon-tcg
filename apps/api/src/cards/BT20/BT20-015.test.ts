import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT20-015.js";

describe("BT20-015 Hisyaryumon", () => {
  it("plays Dorumon or Ryudamon and only grants the attack bonus during an attack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        breeding: true,
        requiresEmpty: "breedingArea",
        target: { filter: { nameOrTrait: [{ tokens: ["Dorumon", "Ryudamon"], match: "name" }] } },
      });
      expect(effect?.actions.slice(1)).toMatchObject([
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "duringAttack" },
        },
        {
          kind: "ModifyDP",
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "duringAttack" },
        },
      ]);
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          grant: { kind: "PreventSecurityActivation", cardType: "Option" },
          duration: "forTheTurn",
        },
      ],
    });
  });

  it("during an attack evolves into Hisyaryumon, plays Ryudamon to empty breeding, and boosts one Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", dp: 6000, as: "attacker", under: ["BT20-010"] }],
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-010", as: "ryudamon" },
          ],
        },
        1: { security: ["BT20-001", "BT20-001", "BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT20-015" && s.state.players[0]!.breeding !== undefined);
    expect(s.state.players[0]!.breeding!.topCard.cardId).toBe("BT20-010");
    expect(s.perm("attacker").currentDP).toBeGreaterThanOrEqual(11000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
  });

  it("does not play into occupied breeding and suppresses checked Option Security effects only on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-010", as: "existing" },
          battleArea: [{ card: "BT20-015", as: "hisyaryumon" }],
          hand: [{ card: "BT20-010", as: "candidate" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("hisyaryumon"));
    expect(s.state.players[0]!.breeding!.topCard.instanceId).toBe(s.perm("existing").topCard.instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT20-017", as: "host", under: ["BT20-015"] }] },
    });
    await inherited.ready();
    expect(observe(inherited.engine).suppressesSecurityEffect(inherited.perm("host"), "BT1-107")).toBe(true);
    inherited.state.turnSeat = 1;
    await advance(inherited.engine).recompute();
    expect(observe(inherited.engine).suppressesSecurityEffect(inherited.perm("host"), "BT1-107")).toBe(false);
  });
  it("declines the attack-triggered evolution and rejects the 5001-DP boundary", async () => {
    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "attacker", under: ["BT20-010"] }],
          hand: [{ card: "BT20-015", as: "hisyaryumon" }],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, as: "defender" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    refused.state.memory = 3;
    expect(
      refused.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: refused.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(refused.perm("attacker").topCard.cardId).toBe("BT20-012");

    const boundary = setupEngine(
      {
        0: { hand: [{ card: "BT20-015", as: "hisyaryumon" }] },
        1: { battleArea: [{ card: "BT20-011", dp: 5001, as: "above" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    boundary.state.memory = 7;
    expect(
      boundary.engine.applyIntent(0, { type: "playCard", instanceId: boundary.inst("hisyaryumon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      boundary.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-015"),
    );
    expect(boundary.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-011")).toBe(
      true,
    );
  });

  it("allows the optional breeding play to be refused on entry", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-010", as: "candidate" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hisyaryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-015"));
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it("keeps the attack boost through the opponent turn and expires at its end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "attacker", under: ["BT20-010"] }],
          hand: [{ card: "BT20-015", as: "hisyaryumon" }, { card: "BT20-010", as: "ryudamon" }, "BT20-007"],
          deck: ["BT20-007", "BT20-007"],
        },
        1: { security: ["BT20-001", "BT20-001", "BT20-001"], deck: ["BT20-010"], hand: ["BT20-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("attacker").topCard.cardId).toBe("BT20-015");
    expect(s.perm("attacker").currentDP).toBe(16000); // 7000 + 5000 + two own-turn inherited 2000 bonuses.
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("attacker").currentDP).toBe(12000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("attacker").currentDP).toBe(7000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });
});
