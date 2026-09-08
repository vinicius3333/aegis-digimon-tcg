import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_043 } from "./BT24-043.js";
import "../index.js";

describe("BT24-043 Tapirmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-043")).toMatchObject({
      cardId: "BT24-043",
      nameEn: "Tapirmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Iliad", "TS"],
    });
  });

  it("reveals three and searches the two printed pools", () => {
    const onPlay = BT24_043.effects?.find((entry) => entry.trigger === "OnPlay");
    const reveal = onPlay?.actions?.[0];
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const additions = reveal?.kind === "RevealAdd" ? reveal.add : undefined;
    expect(additions).toHaveLength(2);
    expect(additions?.[0]).toMatchObject({ to: "hand", filter: { kind: ["Digimon"] } });
    expect(additions?.[1]).toMatchObject({
      to: "hand",
      filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
    });
    expect(BT24_043.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });

  it("adds a trait containing Beast and a TS card while bottoming a Sea Animal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-043", as: "tapirmon" }],
          deck: [
            { card: "BT1-046", as: "beast" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-033", as: "seaAnimalMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("beast").instanceId, s.inst("ts").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tapirmon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("beast").instanceId, s.inst("ts").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("seaAnimalMiss").instanceId]);
  });

  it("resolves both searches from a public play intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-043", as: "tapirmon" }],
          deck: [
            { card: "BT1-046", as: "beast" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-033", as: "seaAnimalMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("beast").instanceId, s.inst("ts").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapirmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ts").instanceId));

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("beast").instanceId,
      s.inst("ts").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("seaAnimalMiss").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("seaAnimalMiss").instanceId);
  });

  it("publicly selects a Shaman for the first search pool", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-043", as: "tapirmon" }],
          deck: [
            { card: "BT1-057", as: "shaman" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-033", as: "bottom" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("shaman").instanceId, s.inst("ts").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapirmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shaman").instanceId));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("shaman").instanceId,
      s.inst("ts").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
  });

  it("publicly bottoms all three cards when both search pools miss", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-043", as: "tapirmon" }],
          deck: [
            { card: "BT1-009", as: "unrelated" },
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tapirmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-043"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("unrelated").instanceId,
      s.inst("seaAnimal").instanceId,
      s.inst("other").instanceId,
    ]);
  });

  it("publicly suspends one opponent and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "host", under: ["BT24-043"] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          hand: [{ card: "BT24-050", as: "opponentUnsuspender" }],
          security: ["BT1-013", "BT1-014", "BT1-015"],
          deck: ["BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId, s.perm("host").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
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
    await settle(
      () =>
        s.perm("first").isSuspended &&
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);

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
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length >= 2 && !observe(s.engine).isAttacking(),
    );

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("second").isSuspended).toBe(false);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    const thirdAttack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    });
    if (!thirdAttack.ok) {
      throw new Error(
        `next-turn attack rejected: ${thirdAttack.reason}; turnSeat=${s.state.turnSeat}; ` +
          `suspended=${s.perm("host").isSuspended}; attacking=${observe(s.engine).isAttacking()}; ` +
          `targets=${s.state.players[1]!.battleArea.map((p) => `${p.permanentId}:${p.isSuspended}`)}`,
      );
    }
    await settle(
      () =>
        s.perm("second").isSuspended &&
        s.events.filter((event) => event.kind === "securityChecked").length >= 3 &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("second").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it.each([
    ["normal green", "BT1-007", false],
    ["alternate blue TS", "BT24-002", true],
  ])("digivolves from the %s egg for cost 0", async (_label, egg, alternate) => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: egg, as: "egg" },
          hand: [{ card: "BT24-043", as: "tapirmon" }],
          deck: [
            { card: "BT1-046", as: "bonusDraw" },
            { card: "BT24-083", as: "ts" },
            { card: "BT1-033", as: "seaAnimalMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tapirmon").instanceId,
        ...(alternate ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("tapirmon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("tapirmon").instanceId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects normal and alternate evolution from a blue non-TS egg", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "egg" },
        hand: [{ card: "BT24-043", as: "tapirmon" }],
        deck: [{ card: "BT1-009", as: "unchanged" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tapirmon").instanceId,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tapirmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("tapirmon").instanceId]);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("egg").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("unchanged").instanceId]);
  });
});
