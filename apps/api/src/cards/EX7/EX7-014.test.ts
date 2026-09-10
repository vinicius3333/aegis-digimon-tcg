import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-014.js";
import "../BT12/BT12-071.js";
import "../BT20/BT20-012.js";
import "../BT20/BT20-015.js";
import "../EX3/EX3-014.js";
import "../EX5/EX5-058.js";
import "../EX5/EX5-060.js";
import "../P/P-143.js";
import "../index.js";

function attackPlayer(s: ReturnType<typeof setupEngine>, seat: 0 | 1, alias: string) {
  return s.engine.applyIntent(seat, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-014 Volcanicdramon", () => {
  it("matches the catalog, all ten KB questions, and the compiled clauses", () => {
    const card = getCardDefinition("EX7-014");
    expect(card).toMatchObject({
      cardId: "EX7-014",
      nameEn: "Volcanicdramon",
      colors: ["Red"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 5 },
        { color: "Black", level: 5, memoryCost: 5 },
      ],
      types: ["Earth Dragon"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Digimon"], dpAtMost: 6000 },
          mode: "playOrMove",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Machine Dragon", "Sky Dragon"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("publicly plays and attacks, deleting exactly one opposing lowest-DP Digimon each time", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-014", as: "volcanic" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-009", as: "lowB" },
            { card: "BT1-014", as: "high" },
          ],
          security: ["BT1-009"],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("volcanic").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.filter((p) => p.topCard.cardId === "BT1-009").length === 1);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-014"]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(attackPlayer(s, 0, "volcanic")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-014");
    await stopLoop(s, loop);
  });

  it("evolves legally from red Lv5 with cost 5, draws once, and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-024", as: "source" }],
        hand: [{ card: "EX7-014", as: "volcanic" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const sourceInstanceId = s.perm("source").topCard.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014");
    expect(s.state.memory).toBe(5);
    expect(s.perm("source").stack.map((c) => c.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    await stopLoop(s, loop);
  });

  it("Q3833/Q4673: publicly blocks the opponent's low-DP play through their turn, then expires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "EX7-014", as: "volcanic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: [
            { card: "BT1-009", as: "small" },
            { card: "BT1-024", as: "large" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("small").instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("large").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-024"));
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("small").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));
    await stopLoop(s, loop);
  });

  it("publicly replaces a battle departure with a free matching-trait Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-014", dp: 5000, as: "volcanic" }],
          hand: [{ card: "ST5-07", as: "replacement" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", suspended: true },
            { card: "BT1-024", dp: 14000, as: "defender", suspended: true },
          ],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("volcanic").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-014"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST5-07")).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("replacement").instanceId)).toBe(false);
    await stopLoop(s, loop);
  });

  it("Q4674: a restricted opponent reveals a low-DP deck card but does not play it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "source" },
            { card: "BT1-014", as: "attacker" },
          ],
          hand: [{ card: "EX7-014", as: "volcanic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT12-071", as: "ancient" }],
          deck: ["ST5-07", "BT10-062", "BT1-013"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014");
    expect(attackPlayer(s, 0, "attacker")).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.deck.length === 0 || s.state.players[1]!.trash.some((c) => c.cardId === "ST5-07"),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST5-07")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT10-062")).toBe(false);
    await stopLoop(s, loop);
  });

  it("accepts the black Lv5 evolution and rejects an illegal Lv4 source without mutation", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "blackSource" }], hand: [{ card: "EX7-014", as: "volcanic" }] },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blackSource").permanentId,
        instanceId: legal.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("blackSource").topCard.cardId === "EX7-014");
    expect(legal.perm("blackSource").stack.map((c) => c.cardId)).toEqual(["BT10-064"]);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "wrongLevel" }],
        hand: [{ card: "EX7-014", as: "volcanic" }],
        deck: ["BT1-013"],
      },
    });
    illegal.state.memory = 10;
    await illegal.ready();
    const beforeDeck = illegal.state.players[0]!.deck.map((c) => c.instanceId);
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongLevel").permanentId,
        instanceId: illegal.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.memory).toBe(10);
    expect(illegal.state.players[0]!.deck.map((c) => c.instanceId)).toEqual(beforeDeck);
    expect(illegal.state.players[0]!.hand.map((c) => c.cardId)).toContain("EX7-014");
  });

  it("Q3834: the restriction still permits Octomon to effect-play Fujitsumon into the opponent area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [
            { card: "EX7-014", as: "volcanic" },
            { card: "EX5-058", as: "octomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014");
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("octomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")).toBe(true);
    await stopLoop(s, loop);
  });

  it("Q4675/Q4676: distinguishes an effect playing the opponent's card from an opponent's effect", async () => {
    const allowed = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [
            { card: "EX7-014", as: "volcanic" },
            { card: "EX5-060", as: "dragomon" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { trash: [{ card: "BT1-014", as: "candidate" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = allowed.engine.startTurnLoop();
    await advance(allowed.engine).waitForMainPhase(0);
    allowed.state.memory = 10;
    expect(
      allowed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: allowed.perm("source").permanentId,
        instanceId: allowed.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => allowed.perm("source").topCard.cardId === "EX7-014");
    allowed.state.memory = 10;
    expect(
      allowed.engine.applyIntent(0, { type: "playCard", instanceId: allowed.inst("dragomon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => allowed.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-014"));
    expect(allowed.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-014")).toBe(true);
    await stopLoop(allowed, loop);

    const blocked = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [
            { card: "EX7-014", as: "volcanic" },
            { card: "BT1-014", as: "victim" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { hand: [{ card: "EX5-060", as: "dragomon" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blockedLoop = blocked.engine.startTurnLoop();
    await advance(blocked.engine).waitForMainPhase(0);
    blocked.state.memory = 10;
    expect(
      blocked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blocked.perm("source").permanentId,
        instanceId: blocked.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => blocked.perm("source").topCard.cardId === "EX7-014");
    advance(blocked.engine).endMainPhaseIfOpen(0);
    await advance(blocked.engine).waitForMainPhase(1);
    blocked.state.memory = 10;
    expect(
      blocked.engine.applyIntent(1, { type: "playCard", instanceId: blocked.inst("dragomon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => blocked.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "EX5-060"));
    expect(blocked.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-014")).toBe(false);
    expect(blocked.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT1-014");
    await stopLoop(blocked, blockedLoop);
  });

  // Retained red: Q3835 currently moves P-143 into breeding despite the active restriction.
  it("Q3835/Q6509: blocks both an end-turn move and an effect play into breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "EX7-014", as: "volcanic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "P-143", as: "drimogemon" },
            { card: "BT20-012", as: "ginryumon" },
          ],
          hand: [
            { card: "BT20-015", as: "hisyaryumon" },
            { card: "BT20-010", as: "ryudamon" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("ginryumon").permanentId,
        instanceId: s.inst("hisyaryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ginryumon").topCard.cardId === "BT20-015");
    expect(s.state.players[1]!.breeding).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "P-143")).toBe(true);
    expect(s.state.players[1]!.breeding).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop);
  });

  it("Q3836/Q6718: proves DigiXros replacement identity or retains the named engine seam", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-014", as: "volcanic" }],
          hand: [
            { card: "EX3-014", as: "dorbickmon" },
            { card: "EX3-005", as: "vorvomon" },
            { card: "EX3-006", as: "flare" },
            { card: "EX3-008", as: "flamedramon" },
            { card: "EX3-009", as: "volcdramon" },
            { card: "EX3-011", as: "lavogaritamon" },
            { card: "ST5-07", as: "replacement" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    const materials = ["volcanic", "vorvomon", "flare", "flamedramon", "volcdramon"].map((alias) =>
      alias === "volcanic" ? s.perm(alias).topCard.instanceId : s.inst(alias).instanceId,
    );
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("dorbickmon").instanceId,
      digiXros: { materialInstanceIds: materials },
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX3-014"));
    const xros = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX3-014")!;
    expect(xros.stack.map((c) => c.instanceId)).toEqual(expect.arrayContaining(materials));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST5-07")).toBe(true);
    expect(xros.stack.map((c) => c.cardId)).not.toContain("ST5-07");
    assertNoLoudGap(s);
  });
});
