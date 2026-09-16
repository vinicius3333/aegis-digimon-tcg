import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

describe("BT19-099 The Wicked God Descends! — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-099")).toMatchObject({
      cardId: "BT19-099",
      nameEn: "The Wicked God Descends!",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      types: ["Wicked God"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-099")!;
    const effectText = printed.effectText!.replaceAll(" ", " ");
    expect(effectText).toContain(
      "[Main] You may play 1 Digimon with the [Composite] trait card from your trash with the play cost reduced by 4. " +
        "Then, place this card in the battle area.",
    );
    expect(effectText).toContain(
      "[All Turns] When any of your Digimon with [Millenniummon] in its name would leave the battle area, ＜Delay＞",
    );
    expect(effectText).toContain(
      "You may play 1 [Wicked God] trait Digimon card with a play cost 1 higher than that Digimon " +
        "from your hand or trash without paying the cost.",
    );
    expect(printed.securityEffectText).toBe("[Security] Place this card in the battle area.");
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-099");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlayFromZone",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
              },
              count: 1,
            },
            from: ["trash"],
            costReduction: 4,
            optional: true,
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "AllTurns",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDigimonWouldLeave",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Millenniummon"], match: "name" }],
            },
            pickOne: true,
            actions: [
              {
                kind: "PlayFromZone",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Wicked God"], match: "trait" }],
                    playCost: { op: "eq", relativeToLeavingDigimon: 1 },
                  },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
                optional: true,
              },
            ],
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] },
    ]);
  });
});

describe("BT19-099 The Wicked God Descends! — use cost and the colour requirement", () => {
  function colourFixture(ownBoard: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-099", as: "option" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          trash: [{ card: "BT6-012", as: "composite" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("refuses the play with no Purple permanent on the controller's board", async () => {
    const s = colourFixture(["BT1-038"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-099");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("composite").instanceId);
  });

  it("accepts the play off a single Purple permanent and charges the printed 4 plus the reduced revival", async () => {
    const s = colourFixture(["BT3-076", "BT1-038"]);
    await s.ready();
    const compositeId = s.inst("composite").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === compositeId));

    expect(s.state.memory).toBe(5);
  });
});

describe("BT19-099 The Wicked God Descends! — [Main]", () => {
  function mainFixture(trash: (string | { card: string; as: string })[], opts: { decline?: boolean }): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-099", as: "option" }, "BT1-009"],
          battleArea: [{ card: "BT3-076", as: "purple" }],
          trash,
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true }
        : { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("revives the [Composite] Digimon at cost - 4 and then places itself, leaving the trait near miss behind", async () => {
    const s = mainFixture(
      [
        { card: "BT6-012", as: "composite" },
        { card: "BT1-013", as: "traitMiss" },
      ],
      {},
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const compositeId = s.inst("composite").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    const revived = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === compositeId);
    expect(revived).toBeDefined();
    expect(revived!.topCard!.cardId).toBe("BT6-012");
    const placed = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(boardCardIds(s, 0)).toEqual(["BT19-099", "BT3-076", "BT6-012"]);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("traitMiss").instanceId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("places itself for the printed 4 when the trash holds only the trait near miss", async () => {
    const s = mainFixture([{ card: "BT1-013", as: "traitMiss" }], {});
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    expect(boardCardIds(s, 0)).toEqual(["BT19-099", "BT3-076"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("traitMiss").instanceId]);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("declined: the revival is skipped but the Option still places itself", async () => {
    const s = mainFixture([{ card: "BT6-012", as: "composite" }], { decline: true });
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    expect(boardCardIds(s, 0)).toEqual(["BT19-099", "BT3-076"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("composite").instanceId]);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });
});

describe("BT19-099 The Wicked God Descends! — ＜Delay＞ on a Millenniummon leaving (Q3175)", () => {
  function delayFixture(
    millenniummon: string,
    hand: (string | { card: string; as: string })[],
    prefer: string[],
    opts: { decline?: boolean } = {},
  ): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-099", as: "option" },
            { card: "BT3-076", as: "purple" },
            { card: millenniummon, as: "mill" },
          ],
          hand: [{ card: "BT15-098", as: "mist" }, ...hand],
          trash: [],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-051", as: "bystander" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      opts.decline === true
        ? { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: prefer }
        : { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 10;
    return s;
  }

  const playMistBarrier = (s: EngineSetup): unknown =>
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mist").instanceId });

  it("plays the play-cost-15 [Wicked God] free when the play-cost-14 Millenniummon leaves", async () => {
    const prefer: string[] = [];
    const s = delayFixture(
      "BT18-019",
      [
        { card: "BT19-075", as: "moon" },
        { card: "BT19-101", as: "zeed" },
        { card: "BT6-012", as: "composite" },
        "BT1-009",
      ],
      prefer,
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;
    const moonId = s.inst("moon").instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === moonId));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT18-019");
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(moonId);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("zeed").instanceId, s.inst("composite").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).not.toContain("BT19-099");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-099");
    assertNoLoudGap(s);
  });

  it("plays the play-cost-16 [Wicked God] instead when the play-cost-15 Millenniummon leaves (Q3175)", async () => {
    const prefer: string[] = [];
    const s = delayFixture(
      "BT2-083",
      [{ card: "BT19-075", as: "moon" }, { card: "BT19-101", as: "zeed" }, "BT1-009"],
      prefer,
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;
    const zeedId = s.inst("zeed").instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === zeedId));

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(zeedId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("moon").instanceId);
    assertNoLoudGap(s);
  });

  it("also reaches into the trash for the [Wicked God] card", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-099", as: "option" },
            { card: "BT3-076", as: "purple" },
            { card: "BT18-019", as: "mill" },
          ],
          hand: [{ card: "BT15-098", as: "mist" }, "BT1-009"],
          trash: [{ card: "BT19-075", as: "moon" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-051", as: "bystander" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;
    const moonId = s.inst("moon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mist").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === moonId));

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toContain(moonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(moonId);
    assertNoLoudGap(s);
  });

  it("near miss: a Digimon without [Millenniummon] in its name leaving does nothing", async () => {
    const prefer: string[] = [];
    const s = delayFixture(
      "BT6-012",
      [{ card: "BT19-075", as: "moon" }, { card: "BT19-101", as: "zeed" }, "BT1-009"],
      prefer,
    );
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("moon").instanceId, s.inst("zeed").instanceId]),
    );
    expect(boardCardIds(s, 0)).toEqual(["BT15-098", "BT19-099", "BT3-076"]);
    assertNoLoudGap(s);
  });

  it("declined: the ＜Delay＞ is not paid, the Option stays on the board and nothing is played", async () => {
    const prefer: string[] = [];
    const s = delayFixture("BT18-019", [{ card: "BT19-075", as: "moon" }, "BT1-009"], prefer, { decline: true });
    prefer.push(s.perm("mill").permanentId, s.perm("mill").topCard!.instanceId);
    await s.ready();
    const millInstanceId = s.perm("mill").topCard!.instanceId;

    expect(playMistBarrier(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === millInstanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("moon").instanceId);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT19-099");
  });
});

describe("BT19-099 The Wicked God Descends! — [Security]", () => {
  it("places itself in the defender's battle area on a real security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "attacker" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [{ card: "BT19-099", as: "flip" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const flipId = s.inst("flip").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === flipId));

    const placed = s.state.players[1]!.battleArea.find((perm) => perm.topCard?.instanceId === flipId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(flipId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(flipId);
    expect(s.state.players[1]!.security.length).toBe(2);
    assertNoLoudGap(s);
  });
});
