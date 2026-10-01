import { describe, expect, it } from "vitest";
import { setupEngine, settle, type BoardSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-063.js";
import "../index.js";

describe("BT16-063", () => {
  it("grants Angel and models Partition", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Partition" }],
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Partition" }],
    });
  });

  it("gains immunity and places an opposing low-level security Digimon into security during DNA digivolution", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentDigimonEffects",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["battleArea"],
      toTop: false,
      condition: { kind: "isDnaDigivolving" },
      source: {
        filter: { zone: "battleArea", level: { lte: { kind: "chooseEitherSecurityCount" } } },
      },
    });
  });

  it("naturally DNA digivolves and places a level-3 opponent into security using either security count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blackMaterial").permanentId, s.perm("yellowMaterial").permanentId],
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-063"));

    const shakkou = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-063");
    expect(shakkou?.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]?.cardId).toBe("BT1-009");
  });

  it("uses the opponent security count for the level cap and rejects a level-5 target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-027", as: "level4Target" },
            { card: "BT1-038", as: "level5Target" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blackMaterial").permanentId, s.perm("yellowMaterial").permanentId],
        instanceId: s.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-063"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-038"]);
    expect(s.state.players[1]!.security).toHaveLength(5);
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-027")).toBe(true);
  });
});

const shakkoumonOnBoard = (s: ReturnType<typeof setupEngine>) =>
  s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-063");

const dnaDigivolveShakkoumon = async (board: BoardSpec, options: SetupEngineOptions, preferredAliases: string[]) => {
  const preferredPicks: string[] = [];
  const s = setupEngine(board, { ...options, preferInstanceIds: preferredPicks });
  preferredPicks.push(...preferredAliases.map((alias) => s.perm(alias).topCard!.instanceId));
  s.state.memory = 0;
  expect(
    s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("blackMaterial").permanentId, s.perm("yellowMaterial").permanentId],
      instanceId: s.inst("shakkou").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => shakkoumonOnBoard(s) !== undefined);
  await settle(() => false, 50);
  return s;
};

describe("BT16-063 Shakkoumon — KB Q&A rulings", () => {
  it("gains opponent-Digimon immunity on a non-DNA digivolve but only places a Digimon in security when DNA digivolving (Q2651)", async () => {
    const normal = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-035", as: "darcmon" }],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    normal.state.memory = 4;
    await normal.ready();
    expect(observe(normal.engine).isRestrictedByEffect(normal.perm("darcmon"), "beAffected", "Digimon")).toBe(false);
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("darcmon").permanentId,
        instanceId: normal.inst("shakkou").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("darcmon").topCard?.cardId === "BT16-063");
    await settle(() => false, 50);

    expect(observe(normal.engine).isRestrictedByEffect(normal.perm("darcmon"), "beAffected", "Digimon")).toBe(true);
    expect(normal.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(normal.state.players[1]!.security).toHaveLength(0);

    const dna = await dnaDigivolveShakkoumon(
      {
        0: {
          battleArea: [
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
      [],
    );
    expect(observe(dna.engine).isRestrictedByEffect(shakkoumonOnBoard(dna)!, "beAffected", "Digimon")).toBe(true);
    expect(dna.state.players[1]!.battleArea).toHaveLength(0);
    expect(dna.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("caps the placed Digimon's level by either security count, not the total of both (Q2652)", async () => {
    const s = await dnaDigivolveShakkoumon(
      {
        0: {
          battleArea: [
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT1-009", as: "level3" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
      ["level4"],
    );

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-009"]);
  });

  it("must place an opponent Digimon that fits the larger security count even when the smaller count would exclude it (Q2653)", async () => {
    const s = await dnaDigivolveShakkoumon(
      {
        0: {
          battleArea: [
            { card: "BT10-061", as: "blackMaterial" },
            { card: "BT10-035", as: "yellowMaterial" },
          ],
          hand: [{ card: "BT16-063", as: "shakkou" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "level6" },
            { card: "BT1-038", as: "level5" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
      ["level6"],
    );

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-080"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-038"]);
  });
});
