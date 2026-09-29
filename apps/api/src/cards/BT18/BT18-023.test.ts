import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import {
  setupEngine,
  settle,
  type CardSpec,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import "../BT5/BT5-091.js";
import "../BT7/BT7-085.js";
import "../BT7/BT7-087.js";
import "../EX3/EX3-053.js";
import { compiled } from "./BT18-023.js";
import "./BT18-024.js";
import "./BT18-037.js";

describe("BT18-023 Lanamon", () => {
  it("keeps Aquatic as a Rule trait and preserves the reveal placement alternatives", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [{ count: 1, to: "hand", orDispositions: [{ to: "placeUnder", underFilter: { colors: ["Blue"] } }] }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "hand", target: { filter: { levels: [3] } } }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-023", as: "lanamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("lanamon"), "Aquatic")).toBe(true);
  });

  it("reveals three on play and adds the only Aqua/Sea Animal Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-023", as: "lanamon" }],
          deck: [{ card: "BT1-033", as: "aqua" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lanamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("naturally places the revealed Aqua/Sea Animal card under a blue Digimon when chosen", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-030", as: "host" }],
          hand: [{ card: "BT18-023", as: "lanamon" }],
          deck: [{ card: "BT1-033", as: "aqua" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lanamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId));

    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("naturally resolves the reveal after evolving from Calmaramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-024", as: "calmaramon" }],
          hand: [{ card: "BT18-023", as: "lanamon" }],
          deck: [{ card: "BT1-009" }, { card: "BT1-033", as: "aqua" }, { card: "BT1-010" }, { card: "BT1-011" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calmaramon").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.cardId === "BT18-023");

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("digivolves from Calmaramon for 0 and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-024", as: "calmaramon" }],
        hand: [{ card: "BT18-023", as: "lanamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calmaramon").permanentId,
        instanceId: s.inst("lanamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.cardId === "BT18-023");

    expect(s.state.memory).toBe(3);
    expect(s.perm("calmaramon").stack.at(-1)?.cardId).toBe("BT18-024");
  });

  it("returns an opposing level 3 from an evolved host's inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-023"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "level3", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("level3").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
  });
});

describe("BT18-023 Lanamon — KB Q&A rulings", () => {
  const nonQualifyingDeck: CardSpec[] = [
    { card: "BT1-009", as: "topOfDeck" },
    { card: "BT1-010" },
    { card: "BT1-009" },
    { card: "BT1-010" },
  ];

  function digivolveLanamonOntoCalmaramon(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("calmaramon").permanentId,
      instanceId: s.inst("lanamon").instanceId,
      alternateRequirementIndex: 0,
    });
  }

  function digivolveLobomonOntoKoji(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("koji").permanentId,
      instanceId: s.inst("lobomon").instanceId,
    });
  }

  function handIds(s: EngineSetup): string[] {
    return s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  }

  it("does not treat a Tamer digivolving through a Tamer requirement as a digivolving Digimon, unlike Lanamon from Calmaramon (Q2936)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT7-087", as: "koji" },
            { card: "BT5-091", as: "watcher" },
          ],
          hand: [
            { card: "BT18-023", as: "lanamon" },
            { card: "BT18-037", as: "lobomon" },
          ],
          deck: nonQualifyingDeck,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    watched.state.memory = 5;
    await watched.ready();

    expect(digivolveLobomonOntoKoji(watched)).toEqual({ ok: true });
    await settle(() => watched.perm("koji").topCard.instanceId === watched.inst("lobomon").instanceId);
    await settle();
    expect(watched.perm("watcher").isSuspended).toBe(false);

    expect(digivolveLanamonOntoCalmaramon(watched)).toEqual({ ok: true });
    await settle(() => watched.perm("calmaramon").topCard.instanceId === watched.inst("lanamon").instanceId);
    await settle();
    expect(watched.perm("watcher").isSuspended).toBe(true);

    const locked = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT7-087", as: "koji" },
          ],
          hand: [
            { card: "BT18-023", as: "lanamon" },
            { card: "BT18-037", as: "lobomon" },
          ],
          deck: nonQualifyingDeck,
        },
        1: { hand: [{ card: "EX3-053", as: "metallicdramon" }] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    locked.state.memory = 5;
    await locked.ready();
    await advance(locked.engine).verb.playInstances([locked.inst("metallicdramon").instanceId]);
    await settle();
    expect(locked.state.players[0]!.battleArea).toHaveLength(2);

    expect(digivolveLanamonOntoCalmaramon(locked).ok).toBe(false);
    expect(locked.perm("calmaramon").topCard.cardId).toBe("BT18-024");

    expect(digivolveLobomonOntoKoji(locked)).toEqual({ ok: true });
    await settle(() => locked.perm("koji").topCard.instanceId === locked.inst("lobomon").instanceId);
    expect(locked.perm("koji").topCard.cardId).toBe("BT18-037");
  });

  it("performs the digivolution bonus draw for any kind of digivolution, including Lanamon's [Digivolve] and a Tamer base (Q2937)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-024", as: "calmaramon" },
            { card: "BT7-087", as: "koji" },
          ],
          hand: [
            { card: "BT18-023", as: "lanamon" },
            { card: "BT18-037", as: "lobomon" },
          ],
          deck: [{ card: "BT1-009", as: "lanamonBonusDraw" }, "BT1-010", "BT1-009", "BT1-010", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(digivolveLanamonOntoCalmaramon(s)).toEqual({ ok: true });
    await settle(() => s.perm("calmaramon").topCard.instanceId === s.inst("lanamon").instanceId);
    await settle();
    expect(s.state.memory).toBe(5);
    expect(handIds(s)).toEqual([s.inst("lobomon").instanceId, s.inst("lanamonBonusDraw").instanceId]);

    const deckBeforeTamerDigivolve = s.state.players[0]!.deck.length;
    expect(digivolveLobomonOntoKoji(s)).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard.instanceId === s.inst("lobomon").instanceId);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeTamerDigivolve - 1);
  });

  it("cannot attack the turn it digivolves from a Tamer or other card placed on the field that turn (Q2938)", async () => {
    async function digivolveThenAttack(calmaramon: PermanentSpec) {
      const s = setupEngine(
        {
          0: { battleArea: [calmaramon], hand: [{ card: "BT18-023", as: "lanamon" }], deck: nonQualifyingDeck },
          1: { security: 1 },
        },
        { autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(digivolveLanamonOntoCalmaramon(s)).toEqual({ ok: true });
      await settle(() => s.perm("calmaramon").topCard.instanceId === s.inst("lanamon").instanceId);
      await settle();
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("calmaramon").permanentId,
        target: { kind: "player" },
      });
    }

    expect((await digivolveThenAttack({ card: "BT18-024", as: "calmaramon", enteredThisTurn: true })).ok).toBe(false);
    expect(await digivolveThenAttack({ card: "BT18-024", as: "calmaramon" })).toEqual({ ok: true });

    async function digivolveFromKojiThenAttack(kojiPlayedThisTurn: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: kojiPlayedThisTurn ? [] : [{ card: "BT7-087", as: "koji" }],
            hand: kojiPlayedThisTurn
              ? [
                  { card: "BT7-087", as: "koji" },
                  { card: "BT18-037", as: "lobomon" },
                ]
              : [{ card: "BT18-037", as: "lobomon" }],
            deck: nonQualifyingDeck,
          },
          1: { security: 1 },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 10;
      await s.ready();
      const kojiPlay = kojiPlayedThisTurn
        ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koji").instanceId })
        : { ok: true };
      expect(kojiPlay).toEqual({ ok: true });
      await settle();
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT7-087"]);
      expect(digivolveLobomonOntoKoji(s)).toEqual({ ok: true });
      await settle(() => s.perm("koji").topCard.instanceId === s.inst("lobomon").instanceId);
      await settle();
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koji").permanentId,
        target: { kind: "player" },
      });
    }

    expect((await digivolveFromKojiThenAttack(true)).ok).toBe(false);
    expect(await digivolveFromKojiThenAttack(false)).toEqual({ ok: true });
  });

  it("must add or place a revealed [Aqua]/[Sea Animal] Digimon even when the player would take none (Q2939)", async () => {
    async function playLanamonRevealing(deck: CardSpec[]) {
      // declinePrompts answers any zero-floor Lanamon selection with no cards, so only a
      // forced pick can move the revealed card out of the reveal.
      const s = setupEngine(
        { 0: { hand: [{ card: "BT18-023", as: "lanamon" }], deck } },
        { declinePrompts: ["Lanamon"], autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lanamon").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      return s;
    }

    const withTarget = await playLanamonRevealing([{ card: "BT1-033", as: "aqua" }, "BT1-009", "BT1-010"]);
    expect(handIds(withTarget)).toEqual([withTarget.inst("aqua").instanceId]);
    expect(withTarget.state.players[0]!.deck).toHaveLength(2);

    const withoutTarget = await playLanamonRevealing(["BT1-009", "BT1-010", "BT1-009"]);
    expect(withoutTarget.state.players[0]!.hand).toHaveLength(0);
    expect(withoutTarget.state.players[0]!.deck).toHaveLength(3);
  });

  it("treats a Tamer under Lanamon as a digivolution card that is trashed when Lanamon leaves the field (Q6593)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-023", as: "lanamon", under: [{ card: "BT7-087", as: "kojiSource" }] }],
      },
    });
    await s.ready();
    expect(s.perm("lanamon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("kojiSource").instanceId]);

    await advance(s.engine).verb.deletePermanent([s.perm("lanamon").permanentId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("lanamon").instanceId, s.inst("kojiSource").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6594)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-023", as: "lanamon", under: [{ card: "BT7-087", as: "kojiSource" }] }],
        security: [{ card: "BT7-087", as: "securityKoji" }],
      },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.Security, s.perm("lanamon"));
    await settle();
    expect(s.perm("lanamon").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("kojiSource").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("securityKoji"));
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("securityKoji").instanceId,
    );
  });

  it("gains the inherited effect in the lower text of a Tamer in its digivolution cards (Q6595)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-023", as: "withTakuya", under: ["BT7-085"] },
          { card: "BT18-023", as: "withoutTamer", under: ["BT18-024"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("withTakuya").currentDP).toBe(7000);
    expect(s.perm("withoutTamer").currentDP).toBe(5000);
  });
});
