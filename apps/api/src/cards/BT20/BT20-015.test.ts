import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import "../BT2/BT2-107.js";
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
        target: { filter: { nameOrTrait: [{ tokens: ["Dorumon", "Ryudamon"], match: "nameExact" }] } },
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
        1: { security: ["BT1-010", "BT1-010", "BT1-010"] },
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

  it("publicly plays into empty breeding, chooses exact Dorumon or Ryudamon, and excludes distractors", async () => {
    for (const [candidate, distractors] of [
      ["dorumon", ["BT20-010", "BT20-007", "BT20-009", "BT20-012"]],
      ["ryudamon", ["BT20-048", "BT20-007", "BT20-009", "BT20-012"]],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT20-015", as: "hisyaryumon" },
              { card: candidate === "dorumon" ? "BT20-048" : "BT20-010", as: candidate },
              ...distractors.map((card, index) => ({ card, as: `distractor${index}` })),
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
      );
      s.state.memory = 7;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hisyaryumon").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () => s.state.players[0]!.breeding?.topCard.cardId === (candidate === "dorumon" ? "BT20-048" : "BT20-010"),
      );
      expect(s.state.players[0]!.breeding?.topCard.cardId).toBe(candidate === "dorumon" ? "BT20-048" : "BT20-010");
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining([...distractors]));
    }
  });

  it("does not grant the attack-only boost when entry resolves outside an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "existing" }],
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-010", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hisyaryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT20-010");
    const hisyaryumon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-015")!;
    expect(hisyaryumon.currentDP).toBe(getCardDefinition("BT20-015")!.dp);
    expect(observe(s.engine).keywordAmount(hisyaryumon, "SecurityAttack")).toBe(0);
  });

  it("does not play into occupied breeding and suppresses checked Option Security effects only on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT20-010", as: "existing" },
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-048", as: "candidate" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hisyaryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-015"));
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
  it("declines the attack-triggered evolution", async () => {
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
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: ["BT20-010"], hand: ["BT20-010"] },
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

  it("actually suppresses an Option Security effect only with the inherited Hisyaryumon source", async () => {
    for (const [under, expectedMemory] of [
      [true, 0],
      [false, -2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT20-058", as: "host", ...(under ? { under: ["BT20-015"] } : {}) }] },
        1: { security: [{ card: "BT2-107", as: "optionSecurity" }] },
      });
      s.state.turnSeat = 0;
      s.state.memory = 0;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
      expect(s.state.memory).toBe(expectedMemory);
      expect(s.state.players[1]!.security).toHaveLength(0);
    }
  });
});
