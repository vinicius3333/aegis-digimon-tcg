import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-015 Beowolfmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-015");
    const compiled = registeredCompiledCards.get("AD1-015") ?? getCompiledCard("AD1-015");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-015");
    expect(definition?.nameEn).toBe("Beowolfmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("reduces an opposing Digimon by exactly 4000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-051", as: "base" }], hand: [{ card: "AD1-015", as: "beowolf" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beowolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("digivolves from Koji with two Hybrid cards underneath for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-083", as: "koji", under: ["BT12-009", "BT12-012"] }],
        hand: [{ card: "AD1-015", as: "beowolf" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("beowolf").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard.cardId === "AD1-015");

    expect(s.state.memory).toBe(2);
    expect(s.perm("koji").stack.some((card) => card.cardId === "BT17-083")).toBe(true);
  });

  it("continues when no Tamer is played, places a Hybrid under a Tamer, and draws two (Q6083)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-015", as: "beowolf" },
            { card: "BT17-083", as: "koji" },
          ],
          hand: [{ card: "BT12-009", as: "hybrid" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "red-source" }], hand: [{ card: "ST1-16", as: "gaia-force" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia-force").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("koji").stack.some((card) => card.cardId === "BT12-009"));
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.perm("koji").stack.some((card) => card.cardId === "BT12-009")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("places a Ten Warriors card under itself and draws two after the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "beowolf" }],
          hand: [{ card: "BT17-017", as: "ten-warriors" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beowolf").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("beowolf").stack.some((card) => card.cardId === "BT17-017"));

    expect(s.perm("beowolf").stack.some((card) => card.cardId === "BT17-017")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("does not draw when the hand has neither a Hybrid nor a Ten Warriors card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "beowolf" }],
          hand: [{ card: "BT1-010", as: "unrelated" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beowolf").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("beowolf").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(false);
  });

  it("inherits the when-attacking -4000 DP effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-017", as: "host", under: ["AD1-015"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("publishes Jamming only as its direct keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-015", as: "beowolf" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("beowolf").permanentId, "Jamming")).toBe(true);
  });
});
