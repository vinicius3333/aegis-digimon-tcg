import { describe, expect, it } from "vitest";
import { getCardDefinition, type ServerEvent } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009", "BT1-009", "BT1-013"];

const TOKENS = ["TOKEN-WarGrowlmon-Token", "TOKEN-Taomon-Token", "TOKEN-Rapidmon-Token"] as const;

const boardCardIds = (s: EngineSetup, seat: 0 | 1): string[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "");

function allianceResponder(mode: "accept" | "decline"): {
  onEvent: (event: ServerEvent) => void;
  bind: (setup: EngineSetup) => void;
  prompts: ServerEvent[];
} {
  let bound: EngineSetup | undefined;
  const prompts: ServerEvent[] = [];
  return {
    prompts,
    bind: (setup) => {
      bound = setup;
    },
    onEvent: (event) => {
      if (event.kind !== "alliancePrompt") return;
      prompts.push(event);
      const ally = (event as ServerEvent & { eligibleAllyIds?: string[] }).eligibleAllyIds?.[0];
      queueMicrotask(() =>
        bound?.engine.applyIntent(0, {
          type: "respondAlliance",
          ...(mode === "accept" && ally !== undefined ? { allyPermanentId: ally } : {}),
        }),
      );
    },
  };
}

describe("BT19-091 Trinity Burst! — catalog, errata and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-091")).toMatchObject({
      cardId: "BT19-091",
      nameEn: "Trinity Burst!",
      colors: ["Red", "Yellow", "Green"],
      kinds: ["Option"],
      playCost: 8,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    });
    expect(getCardDefinition("BT19-091")!.effectText).toBe(
      "While you have a level 5 [WarGrowlmon]/[Taomon]/[Rapidmon], you may ignore this card's color requirements.\n" +
        "[Main] Play 1 [WarGrowlmon] Token (Digimon/Red/6000 DP), [Taomon] Token (Digimon/Yellow/6000 DP), and " +
        "1 [Rapidmon] Token (Digimon/Green/6000 DP). This effect can't play tokens with the same names as your " +
        "Digimon. Then, 1 of your level 5 Digimon gains ＜Alliance＞ twice for the turn and attacks.",
    );
    expect(getCardDefinition("BT19-091")!.securityEffectText).toBe(
      "[Security] You may play 1 level 5 [WarGrowlmon]/[Taomon]/[Rapidmon] from your hand without paying the cost.",
    );
  });

  it("registers the three tokens with their printed colour, DP, no level and no play cost", () => {
    expect(getCardDefinition("TOKEN-WarGrowlmon-Token")).toMatchObject({
      nameEn: "WarGrowlmon Token",
      kinds: ["Digimon"],
      colors: ["Red"],
      dp: 6000,
      playCost: -1,
      isToken: true,
    });
    expect(getCardDefinition("TOKEN-Taomon-Token")).toMatchObject({
      nameEn: "Taomon Token",
      colors: ["Yellow"],
      dp: 6000,
      playCost: -1,
      isToken: true,
    });
    expect(getCardDefinition("TOKEN-Rapidmon-Token")).toMatchObject({
      nameEn: "Rapidmon Token",
      colors: ["Green"],
      dp: 6000,
      playCost: -1,
      isToken: true,
    });
    for (const id of TOKENS) expect(getCardDefinition(id)!.level).toBeUndefined();
  });

  it("compiles the three printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-091");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                levels: [5],
                nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "nameExact" }],
              },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          ...["WarGrowlmon", "Taomon", "Rapidmon"].map((token) => ({
            kind: "PlayToken",
            tokens: [`${token} Token`],
            count: 1,
            payCost: false,
            condition: {
              kind: "not",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: [token], match: "nameExact" }],
                },
              },
            },
          })),
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"], levels: [5], excludeToken: true }, count: 1 },
            keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
            count: 2,
            duration: "forTheTurn",
          },
          {
            kind: "Attack",
            target: { filter: { controller: "mine", kind: ["Digimon"], levels: [5], excludeToken: true }, count: 1 },
            mandatory: true,
            sameTarget: true,
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                levels: [5],
                nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "nameExact" }],
              },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
        ],
      },
    ]);
  });
});

describe("BT19-091 Trinity Burst! — use cost and the multicolour requirement", () => {
  function colourFixture(ownBoard: string[]): EngineSetup {
    const responder = allianceResponder("decline");
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-091", as: "burst" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, onEvent: responder.onEvent },
    );
    responder.bind(s);
    s.state.memory = 10;
    return s;
  }

  const play = (s: EngineSetup) =>
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId });

  it("refuses the play on an all-blue board — no matching colour and no level 5 named Digimon", async () => {
    const s = colourFixture(["BT1-038"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-091");
    expect(boardCardIds(s, 0)).toEqual(["BT1-038"]);
  });

  for (const [colour, card] of [
    ["red", "BT1-013"],
    ["yellow", "BT1-051"],
    ["green", "BT1-071"],
  ] as const) {
    it(`refuses the play off a single ${colour} permanent (CR 4-22-3)`, async () => {
      const s = colourFixture([card]);
      await s.ready();
      expect(play(s)).toEqual({ ok: false, reason: "color-requirement-unmet" });
      expect(s.state.memory).toBe(10);
    });
  }

  it("still refuses with two of the three colours present", async () => {
    const s = colourFixture(["BT1-013", "BT1-051"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("accepts once all three colours are on the field, and charges the printed 8", async () => {
    const s = colourFixture(["BT1-013", "BT1-051", "BT1-071"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("burst").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).not.toContain("BT19-091");
  });

  it("lets one multicolour Digimon cover two of the three requirements (CR 4-22-4)", async () => {
    expect(getCardDefinition("BT10-055")!.colors).toEqual(["Green", "Yellow"]);
    const s = colourFixture(["BT10-055", "BT1-013"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("burst").instanceId));
    expect(s.state.memory).toBe(2);
  });

  it("waives the colour requirement off a level 5 [WarGrowlmon] with no Red/Yellow/Green permanent", async () => {
    const s = colourFixture(["BT24-076"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("burst").instanceId));
    expect(s.state.memory).toBe(2);
  });

  it("does NOT waive off a level 5 BlackWarGrowlmon — [WarGrowlmon] is an exact name (Q3160)", async () => {
    const s = colourFixture(["BT5-079"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.state.memory).toBe(10);
  });

  it("does NOT waive off a level 5 Digimon outside the three names", async () => {
    const s = colourFixture(["BT1-038"]);
    await s.ready();
    expect(play(s)).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });
});

describe("BT19-091 Trinity Burst! — [Main]", () => {
  function mainFixture(extraBoard: string[] = [], mode: "accept" | "decline" = "accept") {
    const responder = allianceResponder(mode);
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-091", as: "burst" }, "BT1-009"],
          battleArea: [
            { card: "BT1-013", as: "peer" },
            { card: "BT1-051", as: "yellow" },
            { card: "BT1-071", as: "green" },
            { card: "BT1-038", as: "host", dp: 20_000 },
            ...extraBoard.map((card, index) => ({ card, as: `extra${index}` })),
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, onEvent: responder.onEvent },
    );
    responder.bind(s);
    s.state.memory = 10;
    return { s, responder };
  }

  it("plays all three tokens with their printed colour, 6000 DP, no level and no play cost", async () => {
    const { s } = mainFixture([], "decline");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    await settle(() => TOKENS.every((id) => boardCardIds(s, 0).includes(id)));

    const tokens = s.state.players[0]!.battleArea.filter((p) => (p.topCard?.cardId ?? "").startsWith("TOKEN-"));
    expect(tokens.map((p) => p.topCard!.cardId).sort()).toEqual([...TOKENS].sort());
    for (const token of tokens) {
      const definition = getCardDefinition(token.topCard!.cardId)!;
      expect(token.currentDP).toBe(6000);
      expect(token.baseDP).toBe(6000);
      expect(definition.level).toBeUndefined();
      expect(definition.playCost).toBe(-1);
      expect(definition.isToken).toBe(true);
      expect(token.controllerSeat).toBe(0);
      expect(token.stack).toHaveLength(0);
    }
    expect(observe(s.engine).effectiveColors(tokens.find((p) => p.topCard!.cardId === TOKENS[0])!)).toEqual(["Red"]);
    expect(observe(s.engine).effectiveColors(tokens.find((p) => p.topCard!.cardId === TOKENS[1])!)).toEqual(["Yellow"]);
    expect(observe(s.engine).effectiveColors(tokens.find((p) => p.topCard!.cardId === TOKENS[2])!)).toEqual(["Green"]);
    expect(s.state.memory).toBe(2);
    expect(s.events.find((event) => event.kind === "actionRejected")).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("skips the [WarGrowlmon] Token while a WarGrowlmon ACE is on the board, and plays the other two (Q3161)", async () => {
    const { s } = mainFixture(["BT19-011"], "decline");
    await s.ready();
    expect(getCardDefinition("BT19-011")).toMatchObject({ nameEn: "WarGrowlmon", isAce: true, level: 5 });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    await settle(() => boardCardIds(s, 0).includes("TOKEN-Rapidmon-Token"));

    const board = boardCardIds(s, 0);
    expect(board).toContain("TOKEN-Taomon-Token");
    expect(board).toContain("TOKEN-Rapidmon-Token");
    expect(board).not.toContain("TOKEN-WarGrowlmon-Token");
    assertNoLoudGap(s);
  });

  it("gives ＜Alliance＞ TWICE to a level 5 Digimon — not to a token or a level 3 peer (Q3162)", async () => {
    const { s } = mainFixture([], "decline");
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    const grants = s.state.players[0]!.battleArea.filter((p) => observe(s.engine).hasKeyword(p, "Alliance")).map(
      (p) => p.topCard!.cardId,
    );
    expect(grants).toEqual(["BT1-038"]);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("green"), "Alliance")).toBe(false);
    for (const token of s.state.players[0]!.battleArea.filter((p) => p.topCard!.cardId.startsWith("TOKEN-"))) {
      expect(observe(s.engine).hasKeyword(token, "Alliance")).toBe(false);
    }
  });

  it("makes the chosen level 5 Digimon attack, prompting ＜Alliance＞ twice (Q3163)", async () => {
    const { s, responder } = mainFixture([], "accept");
    await s.ready();
    const securityBefore = s.state.players[1]!.security.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("burst").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < securityBefore);
    await settle(() => s.state.pendingDecision === undefined && s.perm("host").isSuspended);

    expect(responder.prompts).toHaveLength(2);
    expect(s.perm("host").isSuspended).toBe(true);
    const suspendedAllies = s.state.players[0]!.battleArea.filter(
      (p) => p.isSuspended && p.permanentId !== s.perm("host").permanentId,
    );
    expect(suspendedAllies).toHaveLength(2);
    expect(securityBefore - s.state.players[1]!.security.length).toBe(3);
    expect(s.perm("host").topCard!.cardId).toBe("BT1-038");
    assertNoLoudGap(s);
  });
});

describe("BT19-091 Trinity Burst! — [Security]", () => {
  function securityFixture(hand: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: hand.map((card, index) => ({ card, as: `held${index}` })),
          deck: [...FILLER],
          security: [{ card: "BT19-091", as: "flip" }, ...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    return s;
  }

  it("plays a level 5 [Rapidmon] from hand without paying its cost (Q3164)", async () => {
    const s = securityFixture(["BT3-052"]);
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => boardCardIds(s, 1).includes("BT3-052"));

    expect(boardCardIds(s, 1)).toEqual(["BT3-052"]);
    expect(s.state.players[1]!.hand.map((c) => c.cardId)).not.toContain("BT3-052");
    expect(getCardDefinition("BT3-052")!.playCost).toBe(6);
    expect(Math.abs(s.state.memory - memoryBefore)).toBeLessThan(6);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT19-091")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays nothing when the hand holds only near misses — a Lv.6 [Rapidmon (X Antibody)] and a Lv.5 BlackWarGrowlmon", async () => {
    const s = securityFixture(["BT16-101", "BT5-079"]);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((c) => c.cardId === "BT19-091"));

    expect(boardCardIds(s, 1)).toEqual([]);
    expect(s.state.players[1]!.hand.map((c) => c.cardId).sort()).toEqual(["BT16-101", "BT5-079"]);
    assertNoLoudGap(s);
  });
});
