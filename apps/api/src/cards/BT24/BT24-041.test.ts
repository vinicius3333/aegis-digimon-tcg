import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_041 } from "./BT24-041.js";
import "../index.js";

describe("BT24-041 Minervamon", () => {
  it("shares the three entry triggers and scales De-Digivolve by your Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      const effect = BT24_041.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        scaling: { unit: "cards", per: 1 },
      });
      expect(effect?.actions?.[1]).not.toHaveProperty("optional");
    }
  });
  it("grants Iliad Digimon Reboot and Blocker during the opponent turn", () => {
    const effect = BT24_041.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect?.actions).toHaveLength(2);
    expect(effect?.actions?.[0]).toMatchObject({ keyword: { keyword: "Reboot" } });
    expect(effect?.actions?.[1]).toMatchObject({ keyword: { keyword: "Blocker" } });
  });

  it.each([
    ["Digimon", "BT24-034"],
    ["Tamer", "BT24-102"],
  ])("reduces its play cost by 5 while an Iliad %s is controlled", async (_kind, enabler) => {
    const reduced = setupEngine({
      0: {
        battleArea: [{ card: enabler, as: "iliad" }],
        hand: [{ card: "BT24-041", as: "minervamon" }],
      },
    });
    reduced.state.memory = 10;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("minervamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-041"),
    );
    expect(reduced.state.memory).toBe(3);

    const full = setupEngine({ 0: { hand: [{ card: "BT24-041", as: "minervamon" }] } });
    full.state.memory = 10;
    await full.ready();
    expect(
      full.engine.applyIntent(0, {
        type: "playCard",
        instanceId: full.inst("minervamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => full.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-041"));
    expect(full.state.memory).toBe(-2);
  });

  it("De-Digivolves even when the optional hand play is declined (Q5627)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-041", as: "minervamon" },
            { card: "BT24-011", as: "playable" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-080",
              as: "target",
              under: [
                { card: "BT1-074", as: "targetBottom" },
                { card: "BT1-077", as: "targetUpper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const peeledTop = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-041"));
    const playPrompt = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "BT24-041")!.req;
    expect(playPrompt).toMatchObject({ kind: "optional", sourceCardId: "BT24-041" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("playable").instanceId);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("targetUpper").instanceId);
    expect(s.perm("target").stack[0]!.instanceId).toBe(s.inst("targetBottom").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(peeledTop);
  });

  it("performs two De-Digivolve 1 operations for two own Digimon (Q5628)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-034", as: "other1" }],
        hand: [{ card: "BT24-041", as: "minervamon" }],
      },
      1: {
        battleArea: [
          {
            card: "BT1-080",
            as: "target",
            under: [
              { card: "BT1-068", as: "targetBottom" },
              { card: "BT1-074", as: "targetMiddle" },
              { card: "BT1-077", as: "targetUpper" },
            ],
          },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const peeledTop = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.state.memory).toBe(3);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("targetMiddle").instanceId);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("targetBottom").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("targetUpper").instanceId, peeledTop]),
    );
  });

  it("resolves the On Deletion play and De-Digivolve sequence publicly", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-041", as: "minervamon", suspended: true }],
          hand: [{ card: "BT24-011", as: "iliad" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "attacker", dp: 15000, under: ["BT1-068", "BT1-077"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const minervamonId = s.inst("minervamon").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("minervamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === minervamonId));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("iliad").instanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(minervamonId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("iliad").instanceId,
    );
    expect(s.perm("attacker").stack).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
  });

  it("keeps the optional play and following De-Digivolve in one ordered effect (Q5629)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-041", as: "minervamon" }],
          hand: [{ card: "BT24-011", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-074", "BT1-077"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("minervamon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("played").instanceId,
    );
  });

  it("reproduces the Q5629 future-entrant player-wide DP aura case", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-011", as: "existing", dp: 10000 }],
          hand: [
            { card: "BT24-041", as: "minervamon" },
            { card: "BT24-011", as: "played" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "ST3-10", as: "host" },
            {
              card: "BT1-080",
              as: "target",
              under: [
                { card: "BT1-068", as: "targetBottom" },
                { card: "BT1-074", as: "targetMiddle" },
                { card: "BT1-077", as: "targetUpper" },
              ],
            },
          ],
          hand: [{ card: "EX4-074", as: "aura" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("aura").instanceId,
      }),
    ).toEqual({ ok: true });
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("existing").currentDP).toBe(5000);
    preferred.push(s.perm("target").permanentId);
    const peeledIds = [
      s.perm("target").topCard.instanceId,
      s.inst("targetUpper").instanceId,
      s.inst("targetMiddle").instanceId,
    ];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minervamon").instanceId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-041"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("played").instanceId);
    expect(s.perm("existing").currentDP).toBe(5000);
    expect(s.perm("target").topCard.cardId).toBe("BT1-068");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(peeledIds));
    expect(s.perm("minervamon").currentDP).toBe(7000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("resolves the ordered On Play sequence through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-041", as: "minervamon" },
            { card: "BT24-011", as: "iliad" },
          ],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-074", "BT1-077"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minervamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-011"));

    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("iliad").instanceId,
    );
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("grants Reboot and Blocker only to Iliad Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-041", as: "minervamon" },
          { card: "BT1-009", as: "nonIliad" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    for (const keyword of ["Reboot", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("minervamon"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("nonIliad"), keyword)).toBe(false);
    }
  });

  it("publicly reboots an Iliad Digimon when the opponent's turn begins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-041", as: "minervamon", suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).runTurn(1);
    expect(s.perm("minervamon").isSuspended).toBe(false);
  });

  it("publicly accepts and declines the opponent-turn Blocker window", async () => {
    const accepted = setupEngine({
      0: { battleArea: [{ card: "BT24-041", as: "minervamon" }], security: ["BT1-011"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], deck: ["BT1-010"] },
    });
    accepted.state.turnSeat = 1;
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: accepted.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      accepted.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: accepted.perm("minervamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.events.some((event) => event.kind === "combatResolved"));
    expect(accepted.perm("minervamon").isSuspended).toBe(true);
    expect(accepted.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      accepted.inst("attacker").instanceId,
    );
    expect(accepted.state.players[0]!.security).toHaveLength(1);

    const declined = setupEngine({
      0: { battleArea: [{ card: "BT24-041", as: "minervamon" }], security: [{ card: "BT1-011", as: "checked" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000 }], deck: ["BT1-010"] },
    });
    declined.state.turnSeat = 1;
    await declined.ready();
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.events.some((event) => event.kind === "blockWindowOpened"));
    expect(declined.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => declined.events.some((event) => event.kind === "securityChecked"));
    await settle(() => !observe(declined.engine).isAttacking());
    expect(declined.perm("minervamon").isSuspended).toBe(false);
    expect(declined.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      declined.inst("checked").instanceId,
    );
  });

  it.each([
    ["normal yellow requirement", "BT1-057", false, 4],
    ["alternate TS requirement", "BT24-039", true, 3],
  ])("may use the %s", async (_label, hostCard, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: hostCard, as: "base" }],
        hand: [{ card: "BT24-041", as: "minervamon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("minervamon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("minervamon").instanceId);
    expect(s.state.memory).toBe(5 - expectedCost);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("minervamon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });
});
