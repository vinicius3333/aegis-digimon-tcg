import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-021.js";

describe("BT15-021", () => {
  it("matches the catalog identity and blue level-2 evolution route", () => {
    expect(getCardDefinition("BT15-021")).toMatchObject({
      nameEn: "Gomamon (X Antibody)",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      types: ["Sea Beast", "X Antibody"],
    });
  });

  it("reveals three to add one Sea Beast/Plesiosaur/Beastkin/X Antibody card", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3 });
  });
  it("restricts one opposing Digimon with no more digivolution cards from attacking", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd" }],
    }));

  it("on play adds one matching trait card and bottoms both misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-021", as: "gomamon" }],
          deck: [
            { card: "BT1-030", as: "seaBeast" },
            { card: "BT1-009", as: "nameMiss" },
            { card: "BT1-097", as: "optionMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("seaBeast").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nameMiss").instanceId, s.inst("optionMiss").instanceId]),
    );
  });

  it("when digivolving from a legal blue level-2 stack resolves the same reveal with a Plesiosaur hit", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT15-002", as: "base" },
          hand: [{ card: "BT15-021", as: "gomamon" }],
          deck: [
            { card: "BT10-022", as: "plesiosaur" },
            { card: "BT1-009", as: "missOne" },
            { card: "BT1-097", as: "missTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gomamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-021" && s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("plesiosaur").instanceId]);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-002"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("snapshots source-count eligibility, remains locked after sources increase, and triggers once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-023", as: "host", under: ["BT15-002", "BT15-021"] }],
        },
        1: {
          battleArea: [
            { card: "BT15-023", as: "equal", under: ["BT15-002", "BT15-019"] },
            { card: "BT15-021", as: "fewer", under: ["BT15-002"] },
            { card: "BT15-027", as: "more", under: ["BT15-002", "BT15-019", "BT15-023"] },
          ],
          hand: [{ card: "BT1-009", as: "addedSource" }],
          security: ["BT1-009", "BT1-009"],
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
    await settle(() => observe(s.engine).isRestricted(s.perm("equal"), "attack"));
    await advance(s.engine).verb.placeUnder(s.perm("equal").permanentId, [s.inst("addedSource").instanceId]);

    expect(s.perm("equal").stack).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("equal"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("more"), "attack")).toBe(false);
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(observe(s.engine).isRestricted(s.perm("fewer"), "attack")).toBe(false);
  });

  it("restricts one opposing attacker per turn and resets after the next owner turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-023", as: "host", under: ["BT15-002", "BT15-021"] }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT15-023", as: "firstTarget" },
            { card: "BT15-023", as: "secondTarget" },
            { card: "BT15-023", as: "thirdTarget" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.turnSeat = 0;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("firstTarget"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("firstTarget"), "attack")).toBe(true);
    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(observe(s.engine).isRestricted(s.perm("secondTarget"), "attack")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("thirdTarget").topCard.instanceId);
    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("thirdTarget"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("thirdTarget"), "attack")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
