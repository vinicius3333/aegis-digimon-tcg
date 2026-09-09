import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-049.js";
import "../EX3/EX3-014.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}
describe("EX7-049 Metallicdramon", () => {
  it("De-Digivolves four on play and attack, stopping at level 3", () => {
    expect(getCardDefinition("EX7-049")).toMatchObject({
      cardId: "EX7-049",
      nameEn: "Metallicdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Sky Dragon"],
    });
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 4,
        stopAtLevel: 3,
      });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-049")).toBe(true);
  });
  it("restricts evolution and replaces other departures", () => {
    expect(compiled.effects?.find((e) => e.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
    });
  });

  it("publicly de-digivolves four cards and restricts only opposing battle-area evolution", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX7-049", as: "bry" }] },
      1: {
        battleArea: [{ card: "EX7-014", as: "battle", under: ["EX7-038", "EX7-041", "EX7-045", "EX7-046"] }],
        breeding: { card: "EX7-014", as: "breeding", under: ["EX7-038"] },
      },
    });
    s.state.memory = 13;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bry").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("battle").stack.length === 0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("battle").stack).toHaveLength(0);

    const restricted = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "base" }],
          hand: [{ card: "EX7-049", as: "bry" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          breeding: { card: "BT1-009", as: "egg" },
        },
      },
      { autoSelectCards: true },
    );
    restricted.state.memory = 10;
    await restricted.ready();
    const sourceId = restricted.inst("base").instanceId;
    expect(
      restricted.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: restricted.perm("base").permanentId,
        instanceId: restricted.inst("bry").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(restricted.engine).isRestricted(restricted.perm("opponent"), "digivolve"));
    expect(restricted.state.memory).toBe(5);
    expect(restricted.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(restricted.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      restricted.inst("drawn").instanceId,
    ]);
    expect(observe(restricted.engine).isRestricted(restricted.perm("opponent"), "digivolve")).toBe(true);
    expect(observe(restricted.engine).isRestricted(restricted.perm("egg"), "digivolve")).toBe(false);
  });

  it("publicly replaces an opposing-effect deletion by playing a Rock Dragon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-049", as: "bry", dp: 5000 }],
          trash: [{ card: "BT2-011", as: "rock" }],
        },
        1: { hand: [{ card: "EX7-012", as: "deletor" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-011"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-049")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT2-011")).toBe(true);
  });

  it("lets an immune level-4 Digimon digivolve despite the restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "base" }],
          hand: [{ card: "EX7-049", as: "bry" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT15-047", as: "immune", suspended: true }],
          hand: [{ card: "BT15-049", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("immune"), "beAffected", "Digimon")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bry").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-049");

    s.state.turnSeat = 1;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("immune").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("immune").topCard?.cardId === "BT15-049");
    expect(s.perm("immune").topCard?.cardId).toBe("BT15-049");
  });

  it("publicly De-Digivolves 4 when attacking and stops at level 3", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-049", as: "bry" }] },
        1: {
          battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-038", "EX7-041", "EX7-045", "EX7-046"] }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bry").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").topCard.cardId).toBe("EX7-038");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX7-014", "EX7-041", "EX7-045", "EX7-046"]),
    );
  });

  it("Q3854: allows breeding evolution while restricting an existing level 4, then expires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "base" }],
          hand: [{ card: "EX7-049", as: "bry" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-015", as: "existing", under: ["BT1-009"] }],
          breeding: { card: "BT1-009", as: "egg" },
          hand: [
            { card: "BT1-020", as: "battleEvolution" },
            { card: "BT1-015", as: "breedingEvolution" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bry").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-049");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding");
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(observe(s.engine).isRestricted(s.perm("existing"), "digivolve")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("breedingEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT1-015");
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Breeding");
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("existing").permanentId,
        instanceId: s.inst("battleEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("existing").topCard.cardId === "BT1-020");
    await stopLoop(s, loop, 1);
  });

  it("Q3855: also restricts a level 4 played after the effect activated", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "base" }],
          hand: [{ card: "EX7-049", as: "bry" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          hand: [
            { card: "BT1-015", as: "playedLevel4" },
            { card: "BT1-020", as: "evolution" },
            { card: "BT1-009", as: "followUp" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bry").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-049");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("playedLevel4").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-015"));
    const played = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT1-015")!;
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: played.permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    await stopLoop(s, loop, 1);
  });

  it("Q3856/Q6719: DigiXros departure plays a Rock Dragon but cannot add it as material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-049", as: "bry" }],
          trash: [{ card: "BT2-011", as: "rock" }],
          hand: [
            { card: "EX3-014", as: "dorbickmon" },
            { card: "EX3-005", as: "vorvomon" },
            { card: "EX3-006", as: "flare" },
            { card: "EX3-008", as: "flamedramon" },
            { card: "EX3-009", as: "volcdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    const materials = ["bry", "vorvomon", "flare", "flamedramon", "volcdramon"].map((alias) =>
      alias === "bry" ? s.perm(alias).topCard.instanceId : s.inst(alias).instanceId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX3-014"));
    const xros = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX3-014")!;
    expect(xros.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(materials));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-011")).toBe(true);
    expect(xros.stack.map((card) => card.instanceId)).not.toContain(s.inst("rock").instanceId);
  });
});
