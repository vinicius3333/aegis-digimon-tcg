import { describe, expect, it } from "vitest";
import { getCardDefinition, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-003 Frimon", () => {
  it("matches the catalog identity and Glowing Dawn traits", () => {
    expect(getCardDefinition("BT25-003")).toMatchObject({
      cardId: "BT25-003",
      nameEn: "Frimon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      forms: ["In-Training"],
      types: ["Lesser", "Glowing Dawn", "BEATBREAK"],
    });
  });

  it("trashes the top security and digivolves into a Glowing Dawn card for 1 less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [
            { card: "BT25-035", as: "glowingDawn" },
            { card: "BT1-010", as: "nearMatch" },
          ],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("glowingDawn").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-035" && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT25-003", "BT25-032"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nearMatch").instanceId);
  });

  it("keeps security, memory, and the hand unchanged when the optional digivolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [{ card: "BT25-035", as: "glowingDawn" }],
          security: [
            { card: "BT1-001", as: "topSecurity" },
            { card: "BT1-002", as: "bottomSecurity" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard?.cardId).toBe("BT25-032");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("glowingDawn").instanceId);
  });

  it("does not consume the trigger with empty security, then resolves after security is restored", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [{ card: "BT25-035", as: "glowingDawn" }],
          security: [],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").topCard?.cardId).toBe("BT25-032");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("glowingDawn").instanceId);

    s.give(0, Zone.Security, { card: "BT1-003", as: "restoredSecurity" });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-035" && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("restoredSecurity").instanceId);
  });

  it("shares the inherited Once Per Turn limit across repeated attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [{ card: "BT25-035", as: "firstGlowingDawn" }],
          security: [
            { card: "BT1-001", as: "firstSecurity" },
            { card: "BT1-002", as: "secondSecurity" },
            { card: "BT1-003", as: "thirdSecurity" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("firstGlowingDawn").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard?.cardId === "BT25-035" &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("host").topCard?.cardId).toBe("BT25-035");

    s.give(0, Zone.Hand, { card: "BT25-041", as: "secondGlowingDawn" });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    const secondAttack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    });
    expect(secondAttack).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("secondSecurity").instanceId,
      s.inst("thirdSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondGlowingDawn").instanceId);
    expect(s.perm("host").topCard?.cardId).toBe("BT25-035");
    expect(s.state.memory).toBe(4);
  });

  it("rejects an otherwise legal level-4 destination without Glowing Dawn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-032", as: "host", under: ["BT25-003"] }],
          hand: [{ card: "BT11-039", as: "wrongTrait" }],
          security: [{ card: "BT1-001", as: "topSecurity" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard?.cardId).toBe("BT25-032");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongTrait").instanceId);
  });
});
