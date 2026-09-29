import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import "../BT2/BT2-107.js";
import "../P/P-204.js";
import { compiled } from "./BT20-015.js";

describe("BT20-015 Hisyaryumon", () => {
  it("plays Dorumon or Ryudamon and only grants the attack bonus during an attack", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Ginryumon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["Chronicle"], cost: 3, isAlternate: true },
    ]);
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
    expect(s.perm("attacker").currentDP).toBe(16000);
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
      await settle(
        () => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking(),
      );
      expect(s.state.memory).toBe(expectedMemory);
      expect(s.state.players[1]!.security).toHaveLength(0);
    }
  });
});

describe("BT20-015 Hisyaryumon — KB Q&A rulings", () => {
  it("meets 'if during an attack' when another effect digivolves into it during an opponent's attack (Q4715)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-204", as: "sealedKnight" },
            { card: "BT20-012", as: "ginryumon" },
          ],
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-010", as: "ryudamon" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    const eventKinds = s.events.map((event) => event.kind);
    expect(eventKinds.indexOf("attackDeclared")).toBeLessThan(eventKinds.indexOf("digivolved"));
    expect(eventKinds.indexOf("cardPlayed")).toBeLessThan(eventKinds.indexOf("securityChecked"));
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT20-010");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("sealedKnight").instanceId);
    const hisyaryumon = s.perm("ginryumon");
    expect(hisyaryumon.topCard.instanceId).toBe(s.inst("hisyaryumon").instanceId);
    expect(hisyaryumon.currentDP).toBe(getCardDefinition("BT20-015")!.dp! + 5000);
    expect(observe(s.engine).keywordAmount(hisyaryumon, "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    // Control: the same effect digivolve on the opponent's turn, but with no attack in progress.
    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-012", as: "ginryumon" }],
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-010", as: "ryudamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.turnSeat = 1;
    await control.ready();
    await advance(control.engine).verb.digivolveFromInstance(
      control.perm("ginryumon").permanentId,
      control.inst("hisyaryumon").instanceId,
      { payCost: false },
    );
    await settle(() => control.state.players[0]!.breeding?.topCard.cardId === "BT20-010");
    expect(observe(control.engine).isAttacking()).toBe(false);
    expect(control.perm("ginryumon").currentDP).toBe(getCardDefinition("BT20-015")!.dp);
    expect(observe(control.engine).keywordAmount(control.perm("ginryumon"), "SecurityAttack")).toBe(0);
  });
});
