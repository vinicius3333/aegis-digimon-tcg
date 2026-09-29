import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-024.js";

describe("BT10-024 MetalGreymon", () => {
  it("encodes Material Save 2, Rush, three-target freeze, and both exact DigiXros slots", () => {
    expect(compiled.effects[0]?.keywords).toEqual([expect.objectContaining({ keyword: "MaterialSave", amount: 2 })]);
    expect(compiled.effects[1]?.actions).toEqual([
      expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Rush" }) }),
      expect.objectContaining({
        kind: "Restrict",
        target: expect.objectContaining({ count: 3 }),
        restriction: "attackOrBlock",
        condition: expect.objectContaining({ kind: "digiXrosCount", minimum: 1 }),
      }),
    ]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Greymon"] }, { names: ["MailBirdramon"] }], count: 2 },
    ]);
  });

  it("gains Rush on play and immediately attacks despite summoning sickness", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT10-024", as: "source" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const played = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT10-024");
      return played !== undefined && observe(s.engine).hasKeyword(played, "Rush");
    });
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT10-024");
    expect(played !== undefined && observe(s.engine).hasKeyword(played, "Rush")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("DigiXroses from a Blue Flare board and freezes only Digimon with no more sources than itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-019", as: "greymon" },
            { card: "BT10-021", as: "mailbirdramon" },
          ],
          hand: [{ card: "BT10-024", as: "metalGreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "zeroSources" },
            { card: "BT1-011", as: "twoSources", under: ["BT1-001", "BT1-002"] },
            { card: "BT1-012", as: "threeSources", under: ["BT1-003", "BT1-004", "BT1-005"] },
          ],
          hand: [{ card: "BT1-006", as: "newSource" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.perm("greymon").topCard.instanceId, s.perm("mailbirdramon").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      ["zeroSources", "twoSources"].every(
        (alias) =>
          observe(s.engine).isRestricted(s.perm(alias), "attack") &&
          observe(s.engine).isRestricted(s.perm(alias), "block"),
      ),
    );
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("zeroSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("zeroSources"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("threeSources"), "block")).toBe(false);

    await advance(s.engine).verb.placeUnder(s.perm("twoSources").permanentId, [s.inst("newSource").instanceId]);
    expect(s.perm("twoSources").stack).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "block")).toBe(true);
  });

  it("rejects Greymon (X Antibody) as the exact [Greymon] DigiXros material", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-012", as: "greymonX" },
          { card: "BT10-021", as: "mailbirdramon" },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [s.perm("greymonX").topCard.instanceId, s.perm("mailbirdramon").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("uses Material Save 2 to place its Blue Flare materials under Kiriha when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-088", as: "kiriha" },
            {
              card: "BT10-024",
              as: "metalGreymon",
              under: [
                { card: "BT10-019", as: "greymon" },
                { card: "BT10-021", as: "mailbirdramon" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const metalGreymonId = s.perm("metalGreymon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("metalGreymon").permanentId])).toBe(1);
    await settle(() => s.perm("kiriha").stack.length === 2);

    expect(s.perm("kiriha").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("greymon").instanceId, s.inst("mailbirdramon").instanceId]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === metalGreymonId)).toBe(true);
  });
});

async function digiXrosMetalGreymonThenPassTurn(
  opponentBattleArea: PermanentSpec[],
  afterPlay?: (s: EngineSetup) => Promise<void>,
) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT10-019", as: "greymon" },
          { card: "BT10-021", as: "mailbirdramon" },
        ],
        hand: [{ card: "BT10-024", as: "metalGreymon" }],
        deck: Array<string>(8).fill("BT1-009"),
        security: ["BT1-009", "BT1-009"],
      },
      1: {
        battleArea: opponentBattleArea,
        hand: [{ card: "BT1-006", as: "newSource" }],
        deck: Array<string>(8).fill("BT1-009"),
      },
    },
    { autoSelectCards: true, autoOrderTriggers: true },
  );
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  s.state.memory = 10;
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("metalGreymon").instanceId,
      digiXros: {
        materialInstanceIds: [s.perm("greymon").topCard.instanceId, s.perm("mailbirdramon").topCard.instanceId],
      },
    }),
  ).toEqual({ ok: true });
  await settle(() =>
    opponentBattleArea.some(({ as }) => as !== undefined && observe(s.engine).isRestricted(s.perm(as), "attack")),
  );
  await settle();
  expect(s.perm("metalGreymon").stack).toHaveLength(2);
  await afterPlay?.(s);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  return { s, loop };
}

function declarePlayerAttack(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(1, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

async function attackWithUnlockedControlThenSurrender(s: EngineSetup, loop: Promise<unknown>) {
  expect(observe(s.engine).isRestricted(s.perm("threeSources"), "block")).toBe(false);
  expect(declarePlayerAttack(s, "threeSources")).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

const unlockedControl: PermanentSpec = {
  card: "BT1-012",
  as: "threeSources",
  under: ["BT1-003", "BT1-004", "BT1-005"],
};

describe("BT10-024 MetalGreymon — KB Q&A rulings", () => {
  it("can target an opponent's Digimon with no digivolution cards, which then can't attack or block (Q1949)", async () => {
    const { s, loop } = await digiXrosMetalGreymonThenPassTurn([{ card: "BT1-010", as: "noSources" }, unlockedControl]);

    expect(s.perm("noSources").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("noSources"), "block")).toBe(true);
    expect(declarePlayerAttack(s, "noSources")).toEqual({ ok: false, reason: "illegal-target" });

    await attackWithUnlockedControlThenSurrender(s, loop);
  });

  it("keeps the attack and block lock after the target gains more digivolution cards than MetalGreymon (Q1950)", async () => {
    const { s, loop } = await digiXrosMetalGreymonThenPassTurn(
      [{ card: "BT1-011", as: "target", under: ["BT1-001"] }, unlockedControl],
      async (board) => {
        await advance(board.engine).verb.placeUnder(board.perm("target").permanentId, [
          board.inst("newSource").instanceId,
          ...board.state.players[1]!.deck.slice(0, 2).map(({ instanceId }) => instanceId),
        ]);
      },
    );

    expect(s.perm("target").stack).toHaveLength(4);
    expect(s.perm("metalGreymon").stack).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
    expect(declarePlayerAttack(s, "target")).toEqual({ ok: false, reason: "illegal-target" });

    await attackWithUnlockedControlThenSurrender(s, loop);
  });
});
