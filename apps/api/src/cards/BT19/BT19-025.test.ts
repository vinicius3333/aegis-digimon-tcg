import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-025.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];

function boardIds(s: ReturnType<typeof setupEngine>, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId ?? "?").sort();
}

describe("BT19-025 MetalGreymon", () => {
  it("matches the catalog print: Blue/Black Lv.5 Cyborg/Blue Flare with both printed texts", () => {
    expect(getCardDefinition("BT19-025")).toMatchObject({
      cardId: "BT19-025",
      nameEn: "MetalGreymon",
      colors: ["Blue", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      types: ["Cyborg", "Blue Flare"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
    });
    const definition = getCardDefinition("BT19-025")!;
    expect(definition.effectText).toContain("＜Material Save 2＞");
    expect(definition.effectText).toContain("[On Play] This Digimon gains ＜Rush＞");
    expect(definition.effectText).toContain("[When Attacking] ＜De-Digivolve1＞");
    expect(definition.effectText!.replaceAll("\u00A0", " ")).toContain(
      "[DigiXros -2] Blue [Greymon] x [MailBirdramon]",
    );
    expect(definition.inheritedEffectText!.replaceAll("\u00A0", " ")).toBe(
      "[End of Attack] [Once Per Turn] You may play 1 level 4 or lower Digimon card with the [Blue Flare] trait from under any of your Tamers without paying the cost.",
    );
  });

  it("compiles the four printed clauses onto the printed timings", () => {
    expect(compiled.effects?.map((effect) => [effect.trigger, effect.isInherited === true])).toEqual([
      ["Static", false],
      ["OnPlay", false],
      ["WhenAttacking", false],
      ["EndOfAttack", true],
    ]);
    expect(compiled.effects?.[2]?.actions?.[1]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      optional: true,
      from: ["digivolutionCardsUnderTamers"],
      into: { nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] },
    });
    expect(compiled.effects?.[3]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          optional: true,
          from: ["digivolutionCardsUnderTamers"],
          target: {
            filter: {
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("digivolves from a Blue/Black Lv.4 for 4 memory with the bonus draw, keeping the source in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-022", as: "source" }],
        hand: [{ card: "BT19-025", as: "metal" }, "BT1-013"],
        deck: [...FILLER],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 6;
    await s.ready();
    const sourceInstanceId = s.perm("source").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT19-025");

    expect(s.state.memory).toBe(2);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length - 1);
  });

  it("refuses an illegal digivolution source (Red Lv.4 and Red Lv.3 both fail the Blue/Black Lv.4 requirement)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "redLv4" },
          { card: "BT1-013", as: "redLv3" },
        ],
        hand: [{ card: "BT19-025", as: "metal" }, "BT1-013"],
        deck: [...FILLER],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["redLv4", "redLv3"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("metal").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    }
    expect(s.state.memory).toBe(10);
    expect(boardIds(s, 0)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-025")).toBe(true);
  });

  it("DigiXroses Blue [Greymon] x [MailBirdramon] for -2 per material (7 - 4 = 3) and stacks both", async () => {
    expect(digiXrosRequirementFor("BT19-025")).toEqual([
      { materials: [{ names: ["Greymon"], colors: ["Blue"] }, { names: ["MailBirdramon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-025", as: "metal" },
          { card: "BT19-020", as: "greymon" },
          { card: "BT19-022", as: "mail" },
        ],
        deck: [...FILLER],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metal").instanceId,
        digiXros: { materialInstanceIds: [s.inst("greymon").instanceId, s.inst("mail").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));

    expect(s.state.memory).toBe(-3);
    expect(
      s
        .perm("metal")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("greymon").instanceId, s.inst("mail").instanceId].sort());
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("rejects near-miss DigiXros materials: a Red [Greymon] and a [MetalGreymon] both fail the exact slots", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-025", as: "metal" },
          { card: "BT1-015", as: "redGreymon" },
          { card: "BT19-022", as: "mail" },
          { card: "BT19-025", as: "metalPeer" },
        ],
        deck: [...FILLER],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metal").instanceId,
        digiXros: { materialInstanceIds: [s.inst("redGreymon").instanceId, s.inst("mail").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metal").instanceId,
        digiXros: { materialInstanceIds: [s.inst("metalPeer").instanceId, s.inst("mail").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("＜Material Save 2＞ rescues both specified materials into a Tamer when it loses a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "metal", under: ["BT19-020", "BT19-022", "BT1-015"] },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "wall", dp: 20_000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("metal"), "MaterialSave")).toBe(2);
    const metalId = s.perm("metal").topCard!.instanceId;
    const rescued = s
      .perm("metal")
      .stack.filter((card) => card.cardId !== "BT1-015")
      .map((card) => card.instanceId);
    const redGreymonId = s.perm("metal").stack.find((card) => card.cardId === "BT1-015")!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === metalId));

    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([...rescued].sort());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual([metalId, redGreymonId].sort());
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] ＜Rush＞ lets it attack the turn it is played, where a plain peer cannot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-025", as: "metal" }, { card: "BT1-014", as: "peer" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 15;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-014"));
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Rush")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("peer").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);
    expect(s.perm("metal").isSuspended).toBe(true);
  });

  it("＜Rush＞ granted [On Play] lasts only that turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-025", as: "metal" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 15;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Rush")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(observe(s.engine).hasKeyword(s.perm("metal"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Attacking] de-digivolves 1 opposing Digimon by 1, then digivolves into a [Blue Flare] card from under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "metal" },
            { card: "BT19-081", as: "tamer", under: ["BT19-021", "BT19-026"] },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT19-023", as: "victim", under: ["BT19-021"], suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const metalInstanceId = s.perm("metal").topCard!.instanceId;
    const zeigId = s.perm("tamer").stack.find((card) => card.cardId === "BT19-026")!.instanceId;
    const xiqueUnderTamerId = s.perm("tamer").stack.find((card) => card.cardId === "BT19-021")!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard?.cardId === "BT19-026");

    expect(s.perm("victim").topCard?.cardId).toBe("BT19-021");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT19-023");
    expect(s.perm("metal").topCard?.instanceId).toBe(zeigId);
    expect(s.perm("metal").stack.map((card) => card.instanceId)).toEqual([metalInstanceId]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([xiqueUnderTamerId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Attacking] still de-digivolves when the optional free digivolve is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-025", as: "metal" },
            { card: "BT19-081", as: "tamer", under: ["BT19-026"] },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT19-023", as: "victim", under: ["BT19-021"], suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-023"));

    expect(s.perm("victim").topCard?.cardId).toBe("BT19-021");
    expect(s.perm("metal").topCard?.cardId).toBe("BT19-025");
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-026"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited [End of Attack] plays one Lv.4-or-lower [Blue Flare] from under a Tamer, once per turn, under a real host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-026", as: "host", under: ["BT19-025"] },
            { card: "BT19-081", as: "tamer", under: ["BT19-020", "BT19-022", "BT19-021", "BT19-025"] },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ineligible = s
      .perm("tamer")
      .stack.filter((card) => ["BT19-021", "BT19-025"].includes(card.cardId))
      .map((card) => card.instanceId)
      .sort();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 3);
    const afterFirst = boardIds(s, 0);
    expect(afterFirst).toHaveLength(3);
    expect(afterFirst.filter((id) => ["BT19-020", "BT19-022"].includes(id))).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 2);
    expect(s.perm("tamer").stack).toHaveLength(3);
    expect(boardIds(s, 0)).toEqual(afterFirst);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.phase).toBe(Phase.Main);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(boardIds(s, 0).sort()).toEqual(["BT19-020", "BT19-022", "BT19-026", "BT19-081"]);
    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual(ineligible);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("inherited [End of Attack] is inert for the top card's own copy and with no Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-025", as: "metal" }],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { security: [...SECURITY], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === SECURITY.length - 1);

    expect(boardIds(s, 0)).toEqual(["BT19-025"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("performs the DigiXros at the moment BT19-027's ＜Decode＞ plays MetalGreymon (Q3085)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-027", as: "ryugumon", under: ["BT19-025"] },
            { card: "BT19-020", as: "greymon" },
          ],
          hand: [{ card: "BT19-022", as: "mail" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT19-023", as: "target" }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const greymonId = s.perm("greymon").topCard!.instanceId;
    const mailId = s.inst("mail").instanceId;

    await advance(s.engine).verb.returnToDeck([s.perm("ryugumon").topCard!.instanceId], { toTop: false });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-025"));

    const metal = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-025")!;
    expect(metal.stack.map((card) => card.instanceId).sort()).toEqual([greymonId, mailId].sort());
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT19-027");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
