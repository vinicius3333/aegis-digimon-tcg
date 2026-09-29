import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  assertNoLoudGap,
  setupEngine,
  settle,
  type EngineSetup,
  type PermanentSpec,
  type SetupEngineOptions,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-078.js";
import "../BT13/BT13-007.js";
import "../BT6/BT6-061.js";
import "../BT1/BT1-085.js";
import "../BT1/BT1-086.js";
import "../P/P-063.js";
import "../EX2/EX2-045.js";
import "./BT18-075.js";
import "./BT18-077.js";
import "./BT18-094.js";

describe("BT18-078 Duskmon", () => {
  it("matches the catalog and full IR color-change, attack, inherited, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-078")).toMatchObject({
      cardId: "BT18-078",
      nameEn: "Duskmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 3 }],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Wizard"],
      inheritedEffectText:
        "[On Deletion] You may play 1 Tamer card with a play cost of 4 or less from your trash without paying the cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
              grant: { color: "otherThanWhite" },
              duration: "untilOpponentTurnEnd",
            },
          ],
        })),
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
              into: { controllerDefault: "mine", levels: [4], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
              from: ["trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
        {
          trigger: "OnDeletion",
          isInherited: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { controller: "mine", kind: ["Tamer"], playCostLte: 4 }, count: 1 },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 2, isAlternate: true },
        { names: ["Velgrmon"], cost: 1, isAlternate: true },
      ],
    });
  });

  it("naturally changes one opposing Digimon's original color on play until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("duskmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).effectiveColors(s.perm("target")).includes("Red"));
    const target = s.perm("target");

    expect(observe(s.engine).effectiveColors(target)).toEqual(["Red"]);
    expect(observe(s.engine).effectiveColors(target)).not.toContain("Blue");

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["Blue"]);
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });

  it("naturally changes one opposing Tamer's original color on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-075", as: "base" }], hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: "BT1-086", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("duskmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-078");

    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["Red"]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally digivolves a chosen own Tamer into a level-4 Hybrid from trash for one less memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-094", as: "koichi" },
            { card: "BT18-078", as: "duskmon" },
          ],
          trash: ["BT18-077"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("duskmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077");

    expect(s.state.memory).toBe(8);
    expect(s.perm("koichi").stack.map(({ cardId }) => cardId)).toContain("BT18-094");
    expect(s.state.players[0]!.trash).not.toContainEqual(expect.objectContaining({ cardId: "BT18-077" }));
    assertNoLoudGap(s);
  });

  it("naturally plays an inherited-effect Tamer from trash when its host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-076", dp: 5000, suspended: true, under: ["BT18-078"], as: "host" }],
          trash: ["BT18-094"],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 7000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094")).toBe(true);
    expect(s.state.players[0]!.trash).not.toContainEqual(expect.objectContaining({ cardId: "BT18-094" }));
    assertNoLoudGap(s);
  });
});

describe("BT18-078 Duskmon — KB Q&A rulings", () => {
  const KOICHI = "BT18-094";
  const LIOLLMON = "BT18-075";
  const CALUMON = "EX2-045";
  const KING_DRASIL = "BT13-007";
  const GIGADRAMON = "BT6-061";
  const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];
  const COLOR_CHOICES = ["Red", "Blue", "Yellow", "Green", "Black", "Purple"];

  function digivolveIntoDuskmon(s: EngineSetup, base: string, duskmon: string) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(base).permanentId,
      instanceId: s.inst(duskmon).instanceId,
    });
  }

  async function playDuskmon(s: EngineSetup, duskmon: string) {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(duskmon).instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst(duskmon).instanceId),
    );
    await settle();
  }

  function colorPrompts(s: EngineSetup) {
    return s.decisions.filter(({ req }) => req.kind === "chooseOption" && req.sourceCardId === "BT18-078");
  }

  it("digivolves Koichi Kimura as-is: no 'when a Digimon digivolves' trigger and a Digimon can't-digivolve lock does not stop it (Q3026)", async () => {
    const watched = setupEngine(
      {
        0: {
          battleArea: [
            { card: KOICHI, as: "koichi" },
            { card: LIOLLMON, as: "liollmon" },
            { card: CALUMON, as: "calumon" },
          ],
          hand: [
            { card: "BT18-078", as: "fromTamer" },
            { card: "BT18-078", as: "fromDigimon" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    watched.state.memory = 10;
    await watched.ready();

    expect(digivolveIntoDuskmon(watched, "koichi", "fromTamer")).toEqual({ ok: true });
    await settle(() => watched.perm("koichi").topCard?.cardId === "BT18-078");
    await settle();
    expect(watched.perm("calumon").isSuspended).toBe(false);

    expect(digivolveIntoDuskmon(watched, "liollmon", "fromDigimon")).toEqual({ ok: true });
    await settle(() => watched.perm("calumon").isSuspended);
    expect(watched.perm("calumon").isSuspended).toBe(true);

    const locked = setupEngine(
      {
        0: {
          breeding: { card: KING_DRASIL, as: "drasil" },
          battleArea: [
            { card: KOICHI, as: "koichi" },
            { card: LIOLLMON, as: "liollmon" },
          ],
          hand: [
            { card: "BT18-078", as: "fromTamer" },
            { card: "BT18-078", as: "fromDigimon" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    locked.state.memory = 10;
    await locked.ready();

    expect(digivolveIntoDuskmon(locked, "liollmon", "fromDigimon")).toMatchObject({ ok: false });
    expect(locked.perm("liollmon").topCard?.cardId).toBe(LIOLLMON);
    expect(digivolveIntoDuskmon(locked, "koichi", "fromTamer")).toEqual({ ok: true });
    await settle(() => locked.perm("koichi").topCard?.cardId === "BT18-078");
    expect(locked.perm("koichi").topCard?.cardId).toBe("BT18-078");
    expect(locked.state.memory).toBe(8);
  });

  it("performs the digivolution bonus draw when Koichi Kimura digivolves into it (Q3027)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KOICHI, as: "koichi" }],
          hand: [{ card: "BT18-078", as: "duskmon" }],
          deck: [{ card: "BT1-009", as: "bonus" }, "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(digivolveIntoDuskmon(s, "koichi", "duskmon")).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-078");
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("cannot attack the turn it digivolves from a Koichi Kimura played that turn (Q3028)", async () => {
    async function attackAfterDigivolving(enteredThisTurn: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: KOICHI, as: "koichi", enteredThisTurn }],
            hand: [{ card: "BT18-078", as: "duskmon" }],
            deck: [...FILLER],
          },
          1: { security: ["BT1-011"] },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(digivolveIntoDuskmon(s, "koichi", "duskmon")).toEqual({ ok: true });
      await settle(() => s.perm("koichi").topCard?.cardId === "BT18-078");
      await settle();
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koichi").permanentId,
        target: { kind: "player" },
      }).ok;
    }

    expect(await attackAfterDigivolving(true)).toBe(false);
    expect(await attackAfterDigivolving(false)).toBe(true);
  });

  it("changes the target's original color to the one non-white color chosen (Q3029)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, preferOptionIndex: COLOR_CHOICES.indexOf("Green") },
    );
    s.state.memory = 6;
    await s.ready();
    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["Red"]);

    await playDuskmon(s, "duskmon");

    expect(colorPrompts(s).map(({ req }) => req.options?.choices)).toEqual([COLOR_CHOICES]);
    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["Green"]);
    assertNoLoudGap(s);
  });

  it("keeps a color the target gains from its own effect after its original color is changed (Q3030)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: GIGADRAMON, as: "gigadramon" }], deck: [...FILLER] },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferOptionIndex: COLOR_CHOICES.indexOf("Green") },
    );
    s.state.memory = 6;
    await s.ready();

    await playDuskmon(s, "duskmon");
    expect(observe(s.engine).effectiveColors(s.perm("gigadramon"))).toEqual(["Green"]);

    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const colorsOnOpponentTurn = observe(s.engine).effectiveColors(s.perm("gigadramon"));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect([...colorsOnOpponentTurn].sort()).toEqual(["Green", "Red"]);
    expect(colorsOnOpponentTurn).not.toContain("Black");
  });

  it("uses the most recent color when a second change targets an already-changed Digimon (Q3031)", async () => {
    const options: SetupEngineOptions = { autoSelectCards: true, preferOptionIndex: COLOR_CHOICES.indexOf("Green") };
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-078", as: "first" },
            { card: "BT18-078", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      options,
    );
    s.state.memory = 12;
    await s.ready();

    await playDuskmon(s, "first");
    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["Green"]);

    // The harness reads the preferred option index live, so the second play picks Purple.
    options.preferOptionIndex = COLOR_CHOICES.indexOf("Purple");
    await playDuskmon(s, "second");

    expect(colorPrompts(s)).toHaveLength(2);
    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["Purple"]);
    assertNoLoudGap(s);
  });

  it("offers exactly red, blue, yellow, green, black, or purple as the new original color (Q3032)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: "BT1-086", as: "matt" }] },
      },
      { autoSelectCards: true, preferOptionIndex: COLOR_CHOICES.indexOf("Black") },
    );
    s.state.memory = 6;
    await s.ready();
    expect(observe(s.engine).effectiveColors(s.perm("matt"))).toEqual(["Blue"]);

    await playDuskmon(s, "duskmon");

    const offeredColors = colorPrompts(s).map(({ req }) => req.options?.choices);
    expect(offeredColors).toEqual([COLOR_CHOICES]);
    expect(offeredColors[0]).not.toContain("White");
    expect(observe(s.engine).effectiveColors(s.perm("matt"))).toEqual(["Black"]);
    assertNoLoudGap(s);
  });

  it("[When Attacking] digivolves only a Digimon or Tamer that meets the trashed card's digivolution requirements (Q3033)", async () => {
    async function attackWith(extraBase: PermanentSpec[]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT18-078", as: "duskmon" },
              { card: "BT1-085", as: "tai" },
              { card: "BT1-009", as: "redRookie" },
              ...extraBase,
            ],
            trash: [{ card: "BT18-077", as: "kaiserLeomon" }],
          },
          1: { security: ["BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("duskmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s;
    }

    const withoutValidBase = await attackWith([]);
    expect(withoutValidBase.perm("tai").topCard?.cardId).toBe("BT1-085");
    expect(withoutValidBase.perm("redRookie").topCard?.cardId).toBe("BT1-009");
    expect(withoutValidBase.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      withoutValidBase.inst("kaiserLeomon").instanceId,
    );
    expect(withoutValidBase.state.memory).toBe(10);

    const withKoichi = await attackWith([{ card: KOICHI, as: "koichi" }]);
    expect(withKoichi.perm("koichi").topCard?.instanceId).toBe(withKoichi.inst("kaiserLeomon").instanceId);
    expect(withKoichi.perm("tai").topCard?.cardId).toBe("BT1-085");
    expect(withKoichi.perm("redRookie").topCard?.cardId).toBe("BT1-009");
    expect(withKoichi.state.memory).toBe(8);
  });

  it("keeps Koichi Kimura as a digivolution card and trashes it when the Digimon is deleted (Q6656)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KOICHI, as: "koichi" }],
          hand: [{ card: "BT18-078", as: "duskmon" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const koichiCard = s.perm("koichi").topCard!.instanceId;

    expect(digivolveIntoDuskmon(s, "koichi", "duskmon")).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-078");
    await settle();
    const host = s.perm("koichi");
    expect(host.stack.map(({ instanceId }) => instanceId)).toContain(koichiCard);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    host.isSuspended = true;
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: host.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle();

    const trashIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toContain(koichiCard);
    expect(trashIds).toContain(s.inst("duskmon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the [Security] effects of Tamers in its digivolution cards (Q6657)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-078",
              as: "duskmon",
              under: [
                { card: KOICHI, as: "buriedKoichi" },
                { card: "P-063", as: "buriedRuli" },
              ],
            },
          ],
          security: [{ card: KOICHI, as: "securityKoichi" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).canUseInheritedEffect(s.perm("duskmon"), KOICHI)).toBe(true);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("duskmon"), "P-063")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("securityKoichi").instanceId),
    );
    await settle();

    const topCards = s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId);
    expect(topCards).toContain(s.inst("securityKoichi").instanceId);
    expect(topCards).toHaveLength(2);
    expect(s.perm("duskmon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("buriedKoichi").instanceId, s.inst("buriedRuli").instanceId]),
    );
  });

  it("gains the inherited effect of Koichi Kimura in its digivolution cards (Q6658)", async () => {
    async function attackWithDuskmonOver(under: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-078", as: "duskmon", under: [under] }],
            trash: [{ card: "BT18-026", as: "daipenmon" }],
          },
          1: { security: ["BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("duskmon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("daipenmon").instanceId);
    }

    expect(await attackWithDuskmonOver(KOICHI)).toBe(true);
    expect(await attackWithDuskmonOver(LIOLLMON)).toBe(false);
  });
});
