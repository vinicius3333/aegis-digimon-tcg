import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
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
          deck: ["BT1-009", "BT1-010"],
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
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("places a Ten Warriors card under itself and draws two after the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "beowolf" }],
          hand: [{ card: "BT17-017", as: "ten-warriors" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-011"] },
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
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("does not draw when the hand has neither a Hybrid nor a Ten Warriors card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "beowolf" }],
          hand: [{ card: "BT1-010", as: "unrelated" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-011"] },
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
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
  });

  it("inherits the when-attacking -4000 DP effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-017", as: "host", under: ["AD1-015"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 8000 }], security: ["BT1-011"] },
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

const KOJI = "BT17-083";
const HYBRIDS = ["BT12-009", "BT12-012"];
const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];

// The "koji" alias keeps naming the same permanent after Beowolfmon is stacked on top of it.
async function digivolveKojiIntoBeowolfmon(s: EngineSetup) {
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("koji").permanentId,
      instanceId: s.inst("beowolf").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("koji").topCard.cardId === "AD1-015");
  expect(s.perm("koji").topCard.cardId).toBe("AD1-015");
}

describe("AD1-015 Beowolfmon — KB Q&A rulings", () => {
  it("digivolves a Tamer as-is: no digivolve triggers and ignores a Digimon can't-digivolve effect (Q6909)", async () => {
    const triggers = setupEngine(
      {
        0: {
          battleArea: [
            { card: KOJI, as: "koji", under: HYBRIDS },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [
            { card: "AD1-015", as: "beowolf" },
            { card: "AD1-017", as: "dynasmon" },
          ],
          deck: [...FILLER],
          security: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    triggers.state.memory = 10;
    await triggers.ready();

    await digivolveKojiIntoBeowolfmon(triggers);
    await settle();
    expect(triggers.perm("calumon").isSuspended).toBe(false);

    expect(
      triggers.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: triggers.perm("koji").permanentId,
        instanceId: triggers.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => triggers.perm("calumon").isSuspended);
    expect(triggers.perm("calumon").isSuspended).toBe(true);

    const restricted = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          battleArea: [
            { card: KOJI, as: "koji", under: HYBRIDS },
            { card: "BT1-051", as: "reppamon" },
          ],
          hand: [
            { card: "AD1-015", as: "beowolf" },
            { card: "AD1-015", as: "secondBeowolf" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    restricted.state.memory = 10;
    await restricted.ready();

    expect(
      restricted.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: restricted.perm("reppamon").permanentId,
        instanceId: restricted.inst("secondBeowolf").instanceId,
      }),
    ).toMatchObject({ ok: false });
    await digivolveKojiIntoBeowolfmon(restricted);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves (Q6910)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: KOJI, as: "koji", under: HYBRIDS }],
        hand: [{ card: "AD1-015", as: "beowolf" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    await digivolveKojiIntoBeowolfmon(s);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(2);
  });

  it("cannot attack after digivolving from a Tamer that entered play this turn (Q6911)", async () => {
    const attackAfterDigivolving = async (enteredThisTurn: boolean) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: KOJI, as: "koji", under: HYBRIDS, enteredThisTurn }],
            hand: [{ card: "AD1-015", as: "beowolf" }],
            deck: [...FILLER],
          },
          1: { security: ["BT1-011"] },
        },
        { autoSelectCards: true, autoDeclineOptional: true },
      );
      s.state.memory = 5;
      await s.ready();
      await digivolveKojiIntoBeowolfmon(s);
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koji").permanentId,
        target: { kind: "player" },
      }).ok;
    };

    expect(await attackAfterDigivolving(true)).toBe(false);
    expect(await attackAfterDigivolving(false)).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q6912)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KOJI, as: "koji", under: HYBRIDS }],
          hand: [{ card: "AD1-015", as: "beowolf" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-010", as: "wall", dp: 24000, suspended: true }], security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    await digivolveKojiIntoBeowolfmon(s);

    const beowolfmon = s.perm("koji");
    expect(beowolfmon.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining([KOJI, ...HYBRIDS]));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: beowolfmon.permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["AD1-015", KOJI, ...HYBRIDS]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6913)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-015", as: "beowolf", under: [...HYBRIDS, { card: KOJI, as: "kojiUnder" }] }],
        security: [{ card: KOJI, as: "kojiInSecurity" }],
      },
    });
    await s.ready();
    const driver = advance(s.engine);
    const tamersInPlay = () =>
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === KOJI).length;

    await driver.fire(EffectTiming.SecuritySkill, s.perm("beowolf"));
    await settle();
    expect(tamersInPlay()).toBe(0);
    expect(s.perm("beowolf").stack.some((card) => card.instanceId === s.inst("kojiUnder").instanceId)).toBe(true);

    await driver.fireForInstance(EffectTiming.SecuritySkill, s.inst("kojiInSecurity"));
    await settle(() => tamersInPlay() === 1);
    expect(tamersInPlay()).toBe(1);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6914)", async () => {
    const memoryAfterEndOfAttackDraw = async (stackBeneath: string[]) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "AD1-015", as: "beowolf", under: stackBeneath }],
            hand: [{ card: "BT12-009", as: "hybrid" }],
            deck: [...FILLER],
          },
          1: { security: ["BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 2;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("beowolf").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.length === 2);
      await advance(s.engine).finishAttack();
      expect(s.state.players[0]!.hand).toHaveLength(2);
      return s.state.memory;
    };

    expect(await memoryAfterEndOfAttackDraw([...HYBRIDS, KOJI])).toBe(3);
    expect(await memoryAfterEndOfAttackDraw([...HYBRIDS])).toBe(2);
  });
});
