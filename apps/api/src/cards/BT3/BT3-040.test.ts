import { describe, expect, it } from "vitest";
import type { Permanent } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-040.js";
import "../BT8/BT8-096.js";
import "../BT8/BT8-100.js";

function effectiveColors(s: EngineSetup, permanent: Permanent): string[] {
  return (s.engine as unknown as { effectiveColorsOf(target: Permanent): string[] }).effectiveColorsOf(permanent);
}

describe("BT3-040 Shakkoumon", () => {
  it("is also treated as blue during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-040", as: "shakkoumon" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(effectiveColors(s, s.perm("shakkoumon"))).toEqual(expect.arrayContaining(["Yellow", "Blue"]));
  });

  it("Q1076 does not grant blue while Shakkoumon is in breeding", async () => {
    const s = setupEngine({ 0: { breeding: { card: "BT3-040", as: "shakkoumon" } } });
    await s.engine.recomputeContinuousEffects();

    expect(effectiveColors(s, s.perm("shakkoumon"))).toEqual(["Yellow"]);
  });

  it("gives Security Attack -1 only to opposing Digimon without digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-040", as: "shakkoumon" }] },
      1: {
        battleArea: [
          { card: "BT1-019", as: "sourceless" },
          { card: "BT1-019", as: "withSource", under: ["BT1-010"] },
        ],
      },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("sourceless"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("withSource"), "SecurityAttack")).toBe(0);
  });
});

describe("BT3-040 Shakkoumon — KB Q&A rulings", () => {
  it("can digivolve into a Digimon that requires a blue level 5 during its owner's turn (Q1075)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-040", as: "shakkoumon" },
          { card: "BT1-059", as: "plainYellow" },
        ],
        hand: [
          { card: "BT1-043", as: "blueOnlyForShakkoumon" },
          { card: "BT1-043", as: "blueOnlyForPlainYellow" },
        ],
      },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainYellow").permanentId,
        instanceId: s.inst("blueOnlyForPlainYellow").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });

    const shakkoumonId = s.perm("shakkoumon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: shakkoumonId,
        instanceId: s.inst("blueOnlyForShakkoumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.find((p) => p.permanentId === shakkoumonId)?.topCard.cardId === "BT1-043",
    );

    const digivolved = s.state.players[0]!.battleArea.find((p) => p.permanentId === shakkoumonId)!;
    expect(digivolved.topCard.cardId).toBe("BT1-043");
    expect(digivolved.stack.map(({ cardId }) => cardId)).toContain("BT3-040");
  });

  it("removes Security Attack -1 as soon as the opposing Digimon gains a digivolution card (Q1077)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-019", as: "sourceless" }],
        hand: [{ card: "BT1-020", as: "groundramon" }],
      },
      1: { battleArea: [{ card: "BT3-040", as: "shakkoumon" }] },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    const digimonId = s.perm("sourceless").permanentId;

    expect(observe(s.engine).keywordAmount(digimonId, "SecurityAttack")).toBe(-1);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: digimonId,
        instanceId: s.inst("groundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.find((p) => p.permanentId === digimonId)?.topCard.cardId === "BT1-020",
    );

    expect(
      s.state.players[0]!.battleArea.find((p) => p.permanentId === digimonId)!.stack.map(({ cardId }) => cardId),
    ).toContain("BT1-019");
    expect(observe(s.engine).keywordAmount(digimonId, "SecurityAttack")).toBe(0);
  });

  it("does not make its host count as having a 2-color digivolution card for Top Gun (Q1772)", async () => {
    async function playTopGun(ownBattleArea: PermanentSpec[]): Promise<boolean> {
      const s = setupEngine(
        {
          0: { battleArea: ownBattleArea, hand: [{ card: "BT8-096", as: "topGun" }] },
          1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5_000 }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.engine.recomputeContinuousEffects();
      const targetId = s.perm("target").permanentId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("topGun").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-096"));
      return s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId);
    }

    expect(await playTopGun([{ card: "BT1-020", under: ["BT3-040"] }])).toBe(true);
    expect(await playTopGun([{ card: "BT1-020", under: ["BT8-041"] }])).toBe(false);
    expect(await playTopGun([{ card: "BT1-020" }, { card: "BT3-040" }])).toBe(false);
  });

  it("does not make its host count as having a 2-color digivolution card for Disaster Blaster (Q1780)", async () => {
    async function playDisasterBlaster(ownBattleArea: PermanentSpec[]): Promise<number> {
      const s = setupEngine(
        {
          0: { battleArea: ownBattleArea, hand: [{ card: "BT8-100", as: "disasterBlaster" }] },
          1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10_000 }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.engine.recomputeContinuousEffects();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("disasterBlaster").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-100"));
      return s.perm("target").currentDP;
    }

    expect(await playDisasterBlaster([{ card: "BT1-059", under: ["BT3-040"] }])).toBe(7_000);
    expect(await playDisasterBlaster([{ card: "BT1-059", under: ["BT8-041"] }])).toBe(4_000);
    expect(await playDisasterBlaster([{ card: "BT3-040" }])).toBe(4_000);
  });
});
