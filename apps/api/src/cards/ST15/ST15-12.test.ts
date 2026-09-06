import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-12 WarGreymon", () => {
  it("has Blocker and exposes Blast Digivolve from hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST15-12", as: "field" }], hand: [{ card: "ST15-12", as: "counter" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("field"), "Blocker")).toBe(true);
    expect(registeredCompiledCards.get("ST15-12")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Counter",
          isFromHand: true,
          keywords: [expect.objectContaining({ keyword: "BlastDigivolve" })],
        }),
      ]),
    );
  });

  it("unsuspends itself when either player's security loses a card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }],
          security: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.perm("wargreymon").isSuspended).toBe(false);
  });

  it("can activate only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-010", as: "attacker2" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.perm("wargreymon").isSuspended).toBe(false);

    s.perm("wargreymon").isSuspended = true;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });

  it("Blast Digivolves from hand during a real Counter window without changing memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-063", as: "base" }],
          hand: [{ card: "ST15-12", as: "counter" }],
          security: ["BT1-001"],
          deck: ["BT1-002", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"], deck: ["BT1-002", "BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened")
      throw new Error(`counter window did not open: ${s.events.map((event) => event.kind).join(",")}`);
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("counter").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "ST15-12" && s.events.some((event) => event.kind === "blockWindowOpened"),
    );
    expect(s.perm("base").topCard.cardId).toBe("ST15-12");
    expect(s.state.memory).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "combatResolved", deletedPermanentIds: [attackerId] }),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("base").topCard?.cardId).toBe("ST15-12");
  });

  it("does not unsuspend when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST15-12", as: "wargreymon", suspended: true }],
          security: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });
});
