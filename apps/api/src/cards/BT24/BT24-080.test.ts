import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_080 } from "./BT24-080.js";
import "../index.js";

describe("BT24-080 Megidramon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-080")).toMatchObject({
      cardId: "BT24-080",
      nameEn: "Megidramon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Evil Dragon", "Four Great Dragons"],
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }],
    });
  });

  it("digivolves into this trash card from Dark Dragon/Evil Dragon and keeps lowest-level deletion", () => {
    const trash = BT24_080.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(trash).toMatchObject({ isFromTrash: true });
    expect(trash?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      into: { controller: "mine", zone: "trash", isSelfRef: true, kind: ["Digimon"] },
      from: ["trash"],
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"]) {
      expect(BT24_080.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { superlative: "lowestLevel" }, count: "all" },
      });
    }
  });

  it("digivolves a legal Dark Dragon into this trash card for free at four cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "darkDragon" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("megidramon"));
    await settle(() => s.perm("darkDragon").topCard.instanceId === s.inst("megidramon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(5);
  });

  it("Q5661: public end of turn activates the trash effect, draws, gains Blocker, and deletes the lowest level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "darkDragon" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: [{ card: "BT1-013", as: "bonusDraw" }, "BT1-015"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    const lowAInstanceId = s.inst("lowA").instanceId;
    const lowBInstanceId = s.inst("lowB").instanceId;
    const highId = s.perm("high").permanentId;
    const sourceId = s.perm("darkDragon").topCard.instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.perm("darkDragon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.state.memory).toBe(-3);
    await turn;

    expect(s.perm("darkDragon").topCard.instanceId).toBe(s.inst("megidramon").instanceId);
    expect(s.perm("darkDragon").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(observe(s.engine).hasKeyword(s.perm("darkDragon"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([lowAInstanceId, lowBInstanceId]),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(highId);
  });

  it("public end of turn evolves a legal Purple Evil Dragon host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-077", as: "evilDragon" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: [{ card: "BT1-013", as: "bonusDraw" }, "BT1-015"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("evilDragon").topCard.instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.perm("evilDragon").topCard.instanceId === s.inst("megidramon").instanceId);
    expect(s.state.memory).toBe(-3);
    await turn;
    expect(s.perm("evilDragon").topCard.instanceId).toBe(s.inst("megidramon").instanceId);
    expect(s.perm("evilDragon").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("megidramon").instanceId);
  });

  it("rejects public end-of-turn activation at five cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "darkDragon" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
          deck: ["BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("darkDragon").topCard.instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.perm("darkDragon").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("megidramon").instanceId);
  });

  it.each([
    ["wrong Purple trait", "BT2-075"],
    ["wrong level-4 Dark Dragon", "BT24-070"],
  ])("rejects a %s host during public End of Your Turn", async (_label, hostCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: hostCard, as: "invalid" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("invalid").topCard.instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.perm("invalid").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("megidramon").instanceId);
  });

  it("may refuse a valid public End-of-Turn trash evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "darkDragon" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("darkDragon").topCard.instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.perm("darkDragon").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("megidramon").instanceId);
  });

  it("public play pays 13 and deletes all opposing lowest-level Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-080", as: "megidramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    const lowAInstanceId = s.inst("lowA").instanceId;
    const lowBInstanceId = s.inst("lowB").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowBId));

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([lowAInstanceId, lowBInstanceId]),
    );
  });

  it("public evolution pays 5 and resolves the lowest-level deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-076", as: "base" }],
          hand: [{ card: "BT24-080", as: "megidramon" }],
          deck: [{ card: "BT1-013", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "lowest" }] },
      },
      { autoSelectCards: true },
    );
    const lowestId = s.perm("lowest").permanentId;
    const lowestInstanceId = s.inst("lowest").instanceId;
    const sourceId = s.perm("base").topCard.instanceId;
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("megidramon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(lowestInstanceId);
  });

  it("public Happy Bullet deletion resolves the On Deletion lowest-level wipe", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-080", as: "megidramon" }],
          security: [{ card: "BT1-013", as: "ownSecurity" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-010", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
          hand: [{ card: "BT6-095", as: "happyBullet" }],
          deck: ["BT1-011", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    const lowAId = s.perm("lowA").permanentId;
    const lowBId = s.perm("lowB").permanentId;
    const hostId = s.perm("megidramon").permanentId;
    const hostCardId = s.inst("megidramon").instanceId;
    const lowAInstanceId = s.inst("lowA").instanceId;
    const lowBInstanceId = s.inst("lowB").instanceId;
    const optionId = s.inst("happyBullet").instanceId;
    const securityId = s.inst("ownSecurity").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 7;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowBId));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(hostCardId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([lowAInstanceId, lowBInstanceId, optionId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("does not ignore evolution requirements for an ineligible level 4 Dark Dragon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-070", as: "darkDragon" }],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT24-080", as: "megidramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("megidramon"));

    expect(s.perm("darkDragon").topCard.cardId).toBe("BT24-070");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("megidramon").instanceId);
  });

  it("rejects a public normal evolution from a non-Purple level-5 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-023", as: "invalidSource" }], hand: [{ card: "BT24-080", as: "megidramon" }] },
    });
    s.state.memory = 10;
    await s.ready();
    const sourceId = s.perm("invalidSource").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("megidramon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("invalidSource").topCard.instanceId).toBe(sourceId);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("megidramon").instanceId);
  });

  it("rechecks the hand gate before resolving a second trash copy after the bonus draw (Q5662)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-076", as: "firstHost" },
            { card: "BT24-076", as: "secondHost" },
          ],
          hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: [
            { card: "BT1-013", as: "bonusDraw" },
            { card: "BT1-014", as: "untouched" },
          ],
          trash: [
            { card: "BT24-080", as: "firstMegidramon" },
            { card: "BT24-080", as: "secondMegidramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstHost").topCard.instanceId);
    const firstSourceId = s.perm("firstHost").topCard.instanceId;
    const secondSourceId = s.perm("secondHost").topCard.instanceId;
    const secondMegidramonId = s.inst("secondMegidramon").instanceId;
    const untouchedId = s.inst("untouched").instanceId;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.perm("secondHost").topCard.cardId).toBe("BT24-076");
    expect(s.perm("firstHost").topCard.instanceId).toBe(s.inst("firstMegidramon").instanceId);
    expect(s.perm("firstHost").stack.map((card) => card.instanceId)).toEqual([firstSourceId]);
    expect(s.perm("secondHost").topCard.instanceId).toBe(secondSourceId);
    expect(s.perm("secondHost").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([untouchedId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(secondMegidramonId);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnDeletion])(
    "deletes all opposing Digimon tied for lowest level on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT24-080", as: "megidramon" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "lowA" },
              { card: "BT1-010", as: "lowB" },
              { card: "BT1-014", as: "high" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      const lowAId = s.perm("lowA").permanentId;
      const lowBId = s.perm("lowB").permanentId;
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("megidramon"));

      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
    },
  );

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-080", as: "megidramon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("megidramon"), "Blocker")).toBe(true);
  });

  it("publicly blocks an opponent attack and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-080", as: "megidramon" }], security: [{ card: "BT1-013", as: "security" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 2000 }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("megidramon").permanentId;
    const attackerId = s.inst("attacker").instanceId;
    const securityId = s.inst("security").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(attackerId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
