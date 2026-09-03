import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-004.js";

async function evolveIntoGreymon(s: ReturnType<typeof setupEngine>): Promise<void> {
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("attacker").permanentId,
      instanceId: s.inst("evo").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("attacker").topCard.cardId === "EX1-004");
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("attacker").permanentId,
      instanceId: s.inst("host").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("attacker").topCard.cardId === "BT1-020");
}

describe("EX1-004 Greymon", () => {
  it("plays a Tai Kamiya costing 3 or less on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [
            { card: "EX1-004", as: "evo" },
            { card: "BT1-020", as: "host" },
            { card: "ST1-12", as: "tai" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const taiId = s.inst("tai").instanceId;
    await evolveIntoGreymon(s);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === taiId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a Tai Kamiya costing more than 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [
            { card: "EX1-004", as: "evo" },
            { card: "BT1-020", as: "host" },
            { card: "BT1-085", as: "tai" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await evolveIntoGreymon(s);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("tai").instanceId);
  });

  it("does not play a different Tamer whose name merely includes Tai Kamiya", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [
            { card: "EX1-004", as: "evo" },
            { card: "BT1-020", as: "host" },
            { card: "AD1-022", as: "combinedTai" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await evolveIntoGreymon(s);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("combinedTai").instanceId)).toBe(true);
  });

  it("honors the optional refusal when a legal Tai Kamiya is available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [
            { card: "EX1-004", as: "evo" },
            { card: "BT1-020", as: "host" },
            { card: "ST1-12", as: "tai" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await evolveIntoGreymon(s);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tai").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("plays at most one Tai Kamiya across two player attacks in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [
            { card: "EX1-004", as: "evo" },
            { card: "BT1-020", as: "host" },
            { card: "ST1-12", as: "tai1" },
            { card: "ST1-12", as: "tai2" },
            { card: "BT1-036", as: "unsuspender" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await evolveIntoGreymon(s);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tai2").instanceId)).toBe(true);
  });
});
