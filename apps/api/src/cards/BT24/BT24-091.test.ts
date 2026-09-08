import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_091 } from "./BT24-091.js";
import "../index.js";

describe("BT24-091 Tidal Stream", () => {
  it("matches the immutable catalog identity and link route", () => {
    expect(getCardDefinition("BT24-091")).toMatchObject({
      cardId: "BT24-091",
      nameEn: "Tidal Stream",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 5,
      types: ["TS"],
      linkDp: 2000,
      linkEffect: "[When Attacking] [Once Per Turn] Return 1 of your opponent's lowest level Digimon to the hand.",
      linkRequirement: "[Link] [TS]\u00a0trait: Cost 3",
    });
  });

  it("returns all tied lowest-level Digimon, unsuspends TS despite a higher survivor, and links itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low1" },
            { card: "BT1-046", as: "low2" },
            { card: "BT1-051", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ts").linked.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("low1").instanceId, s.inst("low2").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toContain(s.perm("high"));
    expect(s.perm("ts").isSuspended).toBe(false);
  });

  it("does not unsuspend when the Return action moved no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("ts").isSuspended).toBe(true);
  });

  it("links this Option to a separately selected Digimon", () => {
    const main = BT24_091.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Return",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: "all" },
      bindResultAs: "returnedLowest",
    });
    expect(main?.actions?.[2]).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: {
        filter: { controller: "mine", kind: ["Digimon"] },
        orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
        count: 1,
      },
      allowBreedingRecipient: true,
      payCost: false,
      optional: true,
    });
    expect(BT24_091.linkRequirement).toEqual([{ traits: ["TS"], cost: 3 }]);
  });

  it("waives color from a breeding TS Digimon and links to it (Q5682/Q5685)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-091", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.breeding!.linked.some((card) => card.instanceId === s.inst("option").instanceId),
    );
  });

  it("returns one lowest-level opponent from a public linked-host attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "host", linked: ["BT24-091"] }] },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low1" },
            { card: "BT1-046", as: "low2" },
            { card: "BT1-051", as: "high" },
          ],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect([s.inst("low1").instanceId, s.inst("low2").instanceId]).toContain(s.state.players[1]!.hand[0]!.instanceId);
    expect(s.state.players[1]!.battleArea).toContain(s.perm("high"));
  });
  it("resolves its linked effect during BT24-085's natural End-of-Your-Turn attack (Q5686)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-014", as: "host", linked: [{ card: "BT24-091", as: "option" }] },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low" },
            { card: "BT1-051", as: "high" },
          ],
          security: [
            { card: "BT1-013", as: "security" },
            { card: "BT1-015", as: "security2" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("low").instanceId);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("high").instanceId),
    ).toBe(true);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security2").instanceId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-091", as: "option" }],
          battleArea: [{ card: "BT24-014", as: "ts", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "low" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("option"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("low").instanceId));
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("low").instanceId);
  });

  it("publicly pays Main cost, returns every tied lowest level, unsuspends, and links", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "attacker", suspended: false, dp: 25000 }],
          hand: [{ card: "BT24-091", as: "option" }],
          security: [],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-045", as: "low1" },
            { card: "BT1-046", as: "low2" },
            { card: "BT1-080", as: "high", suspended: true, dp: 20000 },
          ],
          security: [{ card: "BT1-012", as: "checkedSecurity" }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("checkedSecurity").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").linked.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("low1").instanceId, s.inst("low2").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("high").instanceId);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.perm("attacker").linked.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("publicly activates Main from Security without paying, with exact remaining Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: "BT24-091", as: "option" },
            { card: "BT1-013", as: "remaining" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-045", as: "attacker" }],
          hand: ["BT1-009"],
          security: ["BT1-013"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("attacker").instanceId));

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("links despite a public Option-use prohibition, while ordinary Option play is refused (Q5684)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "host" }],
        hand: [{ card: "BT24-091", as: "option" }],
      },
      1: {
        battleArea: [{ card: "BT11-095", as: "whiteSource" }],
        hand: [{ card: "EX1-072", as: "shutdown" }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("shutdown").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("shutdown").instanceId));
    s.state.turnSeat = 0;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("option").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("enforces linked OPT publicly, then resets it after the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-014", as: "host", linked: [{ card: "BT24-091", as: "optionLink" }] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          security: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "target1", suspended: true },
            { card: "BT1-020", as: "target2", suspended: true },
          ],
          security: ["BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const target2Id = s.perm("target2").permanentId;
    const optionLinkId = s.inst("optionLink").instanceId;
    const initialDp = s.perm("host").currentDP;
    preferred.push(s.perm("target1").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 7;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target1").instanceId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(true);
    preferred.splice(0, preferred.length, s.perm("target2").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(true);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([optionLinkId]);
    expect(s.perm("host").currentDP).toBe(initialDp);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target2").instanceId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === target2Id)).toBe(false);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([optionLinkId]);
    expect(s.perm("host").currentDP).toBe(initialDp);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });
});
