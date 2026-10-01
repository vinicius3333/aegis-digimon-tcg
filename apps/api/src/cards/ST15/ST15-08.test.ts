import { describe, expect, it } from "vitest";
import { type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST15-08.js";
import "./ST15-12.js";

describe("ST15-08 Greymon security effect", () => {
  it("can play an Agumon Digimon from hand, not only a Tai Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST15-08", as: "greymon", faceUp: true }, "BT1-001"],
          hand: [{ card: "BT1-010", as: "agumon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId)).toBe(
      true,
    );
  });

  it("can play a Tai Kamiya Tamer from hand and does not require an Agumon target", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST15-08", as: "greymon", faceUp: true }, "BT1-001"],
          hand: [{ card: "BT1-085", as: "tai" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tai").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tai").instanceId)).toBe(true);
  });

  it("grants its inherited memory only once when any attack target switches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", under: ["BT1-009", "ST15-08"] }] },
      1: { battleArea: [{ card: "ST15-12", as: "blocker" }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.memory).toBe(1);
  });
});

function attackIntoGreymonSecurity(hand: string[], trash: string[] = []) {
  const s = setupEngine(
    {
      0: {
        security: [{ card: "ST15-08", as: "greymon" }, "BT1-001"],
        hand: hand.map((card) => ({ card, as: card })),
        trash: trash.map((card) => ({ card, as: card })),
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  return s;
}

async function attackAndBlock(s: EngineSetup, attacker: string) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
  expect(s.state.memory).toBe(0);
  expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => s.events.some((event) => event.kind === "combatResolved"));
}

describe("ST15-08 Greymon — KB Q&A rulings", () => {
  it("plays only a card named exactly [Agumon], not [Agumon Expert], [BushiAgumon] or [ClearAgumon] (Q811)", async () => {
    const nearMiss = attackIntoGreymonSecurity(["BT1-011", "BT4-038"], ["BT11-035"]);
    await settle(() => nearMiss.events.some((event) => event.kind === "securityChecked"));
    await settle();

    expect(nearMiss.state.players[0]!.battleArea).toHaveLength(0);
    expect(Array.from(nearMiss.state.players[0]!.hand, (card) => card.cardId).sort()).toEqual(["BT1-011", "BT4-038"]);
    expect(Array.from(nearMiss.state.players[0]!.trash, (card) => card.cardId)).toContain("BT11-035");

    const exact = attackIntoGreymonSecurity(["BT1-011", "BT1-010"]);
    await settle(() => exact.state.players[0]!.battleArea.length > 0);

    expect(Array.from(exact.state.players[0]!.battleArea, (permanent) => permanent.topCard?.cardId)).toEqual([
      "BT1-010",
    ]);
    expect(Array.from(exact.state.players[0]!.hand, (card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("gains 1 memory when the opponent blocks the Digimon that has this card as a source (Q812)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", under: ["BT1-009", "ST15-08"] }] },
      1: { battleArea: [{ card: "ST15-12", as: "blocker" }] },
    });
    s.state.memory = 0;

    await attackAndBlock(s, "host");

    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory when the attack target of a different Digimon is switched (Q813)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST15-12", as: "host", under: ["BT1-009", "ST15-08"] },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "ST15-12", as: "blocker" }] },
    });
    s.state.memory = 0;

    await attackAndBlock(s, "other");

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("activates its [Security] effect first and then battles the attacking Digimon (Q6160)", async () => {
    const s = attackIntoGreymonSecurity(["BT1-010"]);
    const attackerId = s.perm("attacker").permanentId;
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle();

    const securityEffectIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "ST15-08",
    );
    const checkedIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(securityEffectIndex).toBeGreaterThanOrEqual(0);
    expect(securityEffectIndex).toBeLessThan(checkedIndex);
    expect(Array.from(s.state.players[0]!.battleArea, (permanent) => permanent.topCard?.cardId)).toEqual(["BT1-010"]);

    const checked = s.events[checkedIndex];
    expect(checked).toMatchObject({
      kind: "securityChecked",
      revealedCardId: "ST15-08",
      resolution: "battle",
      battle: { securityCardDP: 5000, attackerDeleted: true, securityDigimonDeleted: false },
    });
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  });
});
