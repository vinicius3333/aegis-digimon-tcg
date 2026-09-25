import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";

const EX4_062 = "EX4-062";
const BLUE_FLARE_DIGIMON = "BT11-030";
const METALGREYMON = "BT10-024";

describe("EX4-062 DigiXros source-zone expansion (trash, [Blue Flare] gate)", () => {
  it("registers full residual-free IR with the suspend-paid zone expansion", () => {
    expect(runtimeCompiledCard("EX4-062")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("EX4-062")?.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        hasDigiXrosRequirement: true,
      },
    });
    const replacement = runtimeCompiledCard("EX4-062")?.effects?.[2]?.actions?.[0] as { actions?: unknown[] };
    expect(replacement.actions?.[0]).toMatchObject({
      kind: "DigiXrosMaterialZoneExpansion",
      zones: ["underTamers", "trash"],
      duration: "forTheTurn",
      cost: { kind: "suspend" },
    });
  });

  it("with EX4-062 suspended, a trash [MetalGreymon] is a legal DigiXros material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: EX4_062, dp: 0, as: "tamer" }],
          trash: [{ card: METALGREYMON, as: "trashMat" }],
          hand: [{ card: BLUE_FLARE_DIGIMON, as: "xros" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;

    const tamer = s.perm("tamer");
    const trashMat = s.inst("trashMat");
    const xros = s.inst("xros");
    s.state.memory = 6;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xros.instanceId,
      digiXros: { materialInstanceIds: [trashMat.instanceId], expanderPermanentIds: [tamer.permanentId] },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === BLUE_FLARE_DIGIMON));
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === BLUE_FLARE_DIGIMON);
    expect(perm!.stack.some((c) => c.instanceId === trashMat.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === trashMat.instanceId)).toBe(false);
    expect(tamer.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).grantedNames(tamer)).toEqual(expect.arrayContaining(["kiriha aonuma", "nene amano"]));
  });

  it("plays itself from security through the public security-skill timing", async () => {
    const s = setupEngine({ 0: { security: [{ card: EX4_062, as: "securityTamer" }] } }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === EX4_062));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === EX4_062)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("securityTamer").instanceId)).toBe(
      false,
    );
  });

  it("gains one memory at Start of Your Main Phase with two total Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: EX4_062, as: "tamer" },
          { card: "BT10-024", as: "ally" },
        ],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT11-030", as: "opponent" }], security: ["BT1-009"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(6);
  });

  it("does not gain memory at the one-Digimon boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: EX4_062, as: "tamer" },
          { card: "BT10-024", as: "ally" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(5);
  });

  it("uses both players' Digimon at the public Start of Main Phase boundary (Q3502)", async () => {
    const positive = setupEngine({
      0: {
        battleArea: [
          { card: EX4_062, as: "tamer" },
          { card: "BT1-010", as: "ownDigimon" },
        ],
        deck: ["BT1-011", "BT1-012"],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponentDigimon" }],
        deck: ["BT1-011", "BT1-012"],
        security: ["BT1-009"],
      },
    });
    positive.state.turnSeat = 0;
    positive.state.memory = 5;
    await positive.ready();
    const positiveLoop = positive.engine.startTurnLoop();
    await advance(positive.engine).waitForMainPhase(0);
    expect(positive.state.players[0]!.battleArea).toHaveLength(2);
    expect(positive.state.players[1]!.battleArea).toHaveLength(1);
    expect(positive.state.memory).toBe(6);
    expect(positive.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await positiveLoop;

    const negative = setupEngine({
      0: {
        battleArea: [
          { card: EX4_062, as: "tamer" },
          { card: "BT1-010", as: "ownDigimon" },
        ],
        deck: ["BT1-011", "BT1-012"],
        security: ["BT1-009"],
      },
      1: { battleArea: [], deck: ["BT1-011", "BT1-012"], security: ["BT1-009"] },
    });
    negative.state.turnSeat = 0;
    negative.state.memory = 5;
    await negative.ready();
    const negativeLoop = negative.engine.startTurnLoop();
    await advance(negative.engine).waitForMainPhase(0);
    expect(negative.state.players[0]!.battleArea).toHaveLength(2);
    expect(negative.state.players[1]!.battleArea).toHaveLength(0);
    expect(negative.state.memory).toBe(5);
    expect(negative.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await negativeLoop;
  });

  it("without suspending EX4-062, a trash material is illegal → DigiXros rejected", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: EX4_062, dp: 0, as: "tamer" }],
        trash: [{ card: METALGREYMON, as: "trashMat" }],
        hand: [{ card: BLUE_FLARE_DIGIMON, as: "xros" }],
      },
    });
    const trashMat = s.inst("trashMat");
    const xros = s.inst("xros");
    s.state.memory = 8;
    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: xros.instanceId,
      digiXros: { materialInstanceIds: [trashMat.instanceId] },
    });
    expect(res.ok).toBe(false);
  });
});
