import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT24-084.js";

describe("BT24-084 Inori Misono", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-084")).toMatchObject({
      cardId: "BT24-084",
      nameEn: "Inori Misono",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["TS"],
    });
  });

  it("gains memory only at 4 or less at the start of your main phase", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
        },
      ],
    });
  });

  it("reacts only to your security removal and pays the suspend cost before free digivolution", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Aegiomon"], match: "nameExact" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Aegiochusmon"], match: "name" }],
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from security without paying the cost", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    });
  });

  it.each([
    [4, 5],
    [5, 5],
  ])("changes memory from %i to %i at the printed boundary", async (memory, expected) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-084", as: "inori" }],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = memory;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(expected);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends Inori to free-digivolve exact Aegiomon after own security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => s.perm("aegiomon").topCard.instanceId === s.inst("aegiochusmon").instanceId);

    expect(s.perm("inori").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("uses Barrier in a public security battle, then Inori evolves the surviving Aegiomon (Q5670)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "P-194", as: "host" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: [{ card: "BT1-009", as: "barrierCost" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011", "BT1-012"],
        },
        1: {
          security: [
            { card: "ST1-10", as: "strong" },
            { card: "BT1-014", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("aegiochusmon").instanceId);
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("host").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.events).toContainEqual({ kind: "barrierPrompt", permanentId: hostId });
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("aegiochusmon").instanceId);
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("inori").isSuspended).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT24-014");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("barrierCost").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("strong").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.events.filter((event) => event.kind === "securityChecked").map((event) => event.revealedCardId)).toEqual([
      "ST1-10",
      "BT1-014",
    ]);
  });

  it("does not trigger when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.perm("inori").isSuspended).toBe(false);
    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-034");
  });

  it("does not digivolve when Inori cannot pay the suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori", suspended: true },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("aegiomon").topCard.cardId).toBe("BT24-034");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("aegiochusmon").instanceId);
  });

  it("publicly refuses the security-removal evolution when Inori is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori", suspended: true },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: [{ card: "BT1-009", as: "remaining" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("inori").isSuspended).toBe(true);
    expect(s.perm("aegiomon").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("aegiochusmon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-084", as: "inori" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-010", "BT1-011"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("inori").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("inori").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("does not retro-trigger Inori when it is newly played from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-034", as: "aegiomon" }],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: [
            { card: "BT24-084", as: "inori" },
            { card: "BT1-014", as: "remainingSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(s.inst("inori").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.perm("inori").isSuspended).toBe(false);
    expect(s.perm("aegiomon").topCard.instanceId).toBe(s.inst("aegiomon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("aegiochusmon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("resolves Owen's Security play before Inori's security-removal trigger (Q5669)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "BT24-034", as: "aegiomon" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011", "BT1-012"],
          security: [
            { card: "BT24-082", as: "owen" },
            { card: "BT1-014", as: "remainingSecurity" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => s.perm("aegiomon").topCard.instanceId === s.inst("aegiochusmon").instanceId);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toContain(s.inst("owen").instanceId);
    expect(s.perm("inori").isSuspended).toBe(true);
    expect(s.perm("aegiomon").topCard.instanceId).toBe(s.inst("aegiochusmon").instanceId);
    expect(s.perm("aegiomon").stack.map((card) => card.instanceId)).toEqual([s.inst("aegiomon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    const owenEffect = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT24-082");
    const inoriEffect = s.events.findIndex(
      (event) =>
        event.kind === "effectTriggered" && event.sourceCardId === "BT24-084" && event.timing === "whenSecurityRemoved",
    );
    expect(owenEffect).toBeGreaterThanOrEqual(0);
    expect(inoriEffect).toBeGreaterThanOrEqual(0);
    expect(owenEffect).toBeLessThan(inoriEffect);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isAttacking()).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
