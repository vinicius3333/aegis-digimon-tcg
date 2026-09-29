import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-050.js";
import "../BT1/BT1-087.js";
import "../BT3/BT3-101.js";
import "../BT6/BT6-025.js";
import "../BT7/BT7-086.js";
import "../BT14/BT14-031.js";
import "../BT15/BT15-047.js";
import "../BT18/BT18-059.js";
import "../BT19/BT19-034.js";
import "../BT19/BT19-083.js";
import "../BT21/BT21-096.js";
import "../EX5/EX5-074.js";
import "./BT12-034.js";
import { compiled } from "./BT12-092.js";

describe("BT12-092 compiled IR module", () => {
  it("registers each printed timing through one declarative effect record", () => {
    const module = getEffectModule("BT12-092");
    expect(module?.cardId).toBe("BT12-092");
    const source = {
      instanceId: "source-092",
      cardId: "BT12-092",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })],
        }),
      ]),
    );
  });

  it("pays 1 memory and becomes a 3000 DP Digimon when Agumon or Greymon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("marcus"));
    expect(s.state.memory).toBe(4);
    expect(s.perm("marcus").currentDP).toBe(3000);
  });

  it("digivolves a Digimon into a yellow Greymon for free when Marcus becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-038", as: "host" },
          ],
          hand: [{ card: "BT12-042", as: "rize" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.perm("host").topCard.cardId === "BT12-042");

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT12-042");
  });

  it("plays Marcus from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-092", as: "marcus", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("marcus"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-092")).toBe(true);
  });
});

const OPPONENT_SECURITY = ["BT1-010", "BT1-010", "BT1-010"];

async function treatMarcusAsDigimon(s: EngineSetup): Promise<void> {
  s.state.memory = 5;
  await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("marcus"));
  expect(s.perm("marcus").currentDP).toBe(3000);
}

function attackPlayer(s: EngineSetup, alias: string) {
  return s.engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

function isInTrash(s: EngineSetup, seat: 0 | 1, cardId: string): boolean {
  return s.state.players[seat]!.trash.some((card) => card.cardId === cardId);
}

describe("BT12-092 Marcus Damon — KB Q&A rulings", () => {
  it("attacks and uses inherited effects as a Digimon, but not on the turn it was played (Q2227)", async () => {
    const established = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus", under: ["BT6-025"] },
            { card: "BT12-034", as: "agumon" },
          ],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await established.ready();

    expect(attackPlayer(established, "marcus").ok).toBe(false);

    await treatMarcusAsDigimon(established);
    const memoryBeforeAttack = established.state.memory;
    expect(attackPlayer(established, "marcus")).toEqual({ ok: true });
    await settle(() => established.state.memory === memoryBeforeAttack + 1);
    await advance(established.engine).finishAttack();

    expect(established.perm("marcus").isSuspended).toBe(true);
    expect(established.state.memory).toBe(memoryBeforeAttack + 1);

    const playedThisTurn = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus", enteredThisTurn: true },
            { card: "BT12-034", as: "agumon" },
          ],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await playedThisTurn.ready();
    await treatMarcusAsDigimon(playedThisTurn);

    expect(attackPlayer(playedThisTurn, "marcus").ok).toBe(false);
    expect(playedThisTurn.perm("marcus").isSuspended).toBe(false);
  });

  it("still counts as a Tamer while it is also treated as a Digimon (Q2228)", async () => {
    async function digivolveIntoKyubimon(withOtherTamer: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-092", as: "marcus" },
              { card: "BT12-034", as: "agumon" },
              ...(withOtherTamer ? [{ card: "BT1-087", as: "otherTamer" }] : []),
              { card: "BT1-050", as: "base" },
            ],
            hand: [
              { card: "BT19-034", as: "kyubimon" },
              { card: "BT19-083", as: "rika" },
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: { security: [...OPPONENT_SECURITY] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await treatMarcusAsDigimon(s);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("kyubimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT19-034");
      await settle();
      return s;
    }

    const withOtherTamer = await digivolveIntoKyubimon(true);
    expect(withOtherTamer.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      withOtherTamer.inst("rika").instanceId,
    );
    expect(withOtherTamer.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT19-083")).toBe(
      false,
    );
    expect(attackPlayer(withOtherTamer, "marcus")).toEqual({ ok: true });

    const marcusIsOnlyTamer = await digivolveIntoKyubimon(false);
    expect(marcusIsOnlyTamer.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT19-083")).toBe(
      true,
    );
  });

  it("resolves its effects as Digimon effects too, so a Digimon immune to opponent Digimon effects ignores them (Q2229)", async () => {
    async function attackWithElecmonInherited(kabuterimonSuspended: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-092", as: "marcus", under: ["BT14-031"] },
              { card: "BT12-034", as: "agumon" },
            ],
          },
          1: {
            battleArea: [{ card: "BT15-047", as: "kabuterimon", suspended: kabuterimonSuspended }],
            security: [...OPPONENT_SECURITY],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await treatMarcusAsDigimon(s);
      expect(attackPlayer(s, "marcus")).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      return s.perm("kabuterimon").currentDP;
    }

    expect(await attackWithElecmonInherited(false)).toBe(3000);
    expect(await attackWithElecmonInherited(true)).toBe(5000);
  });

  it("is deleted by the rule check when an effect reduces its DP to 0 (Q2230)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
            { card: "BT1-087", as: "otherTamer" },
          ],
        },
        1: { security: [{ card: "BT3-101", as: "bifrost" }, ...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    await treatMarcusAsDigimon(s);
    preferInstanceIds.push(s.perm("marcus").topCard.instanceId);

    expect(attackPlayer(s, "marcus")).toEqual({ ok: true });
    await settle(() => isInTrash(s, 1, "BT3-101"));
    await advance(s.engine).finishAttack();

    expect(s.perm("agumon").currentDP).toBe(2000);
    expect(isInTrash(s, 0, "BT12-092")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-092")).toBe(false);
    expect(s.perm("otherTamer").currentDP).toBe(0);
    expect(isInTrash(s, 0, "BT1-087")).toBe(false);
  });

  it("takes the newer effect's DP and adds its <Rush> when a second treat-as-Digimon effect applies (Q5978)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
          ],
          hand: [{ card: "BT21-096", as: "championOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await treatMarcusAsDigimon(s);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("championOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Rush"));

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);

    // Reverse order: the Option applies first, then Marcus's own 3000 DP effect is the newer one.
    const reversed = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
          ],
          hand: [{ card: "BT21-096", as: "championOption" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await reversed.ready();
    reversed.state.memory = 5;
    expect(
      reversed.engine.applyIntent(0, { type: "playCard", instanceId: reversed.inst("championOption").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => reversed.perm("marcus").currentDP === 12000);
    await advance(reversed.engine).fire(EffectTiming.OnStartMainPhase, reversed.perm("marcus"));

    expect(reversed.perm("marcus").currentDP).toBe(3000);
    expect(observe(reversed.engine).hasKeyword(reversed.perm("marcus"), "Rush")).toBe(true);
  });

  it("gains memory from its effect while the opponent allows only Tamer-effect memory gains (Q5979)", async () => {
    async function memoryGainedByAttack(attacker: "marcus" | "agumon") {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-092", as: "marcus", under: attacker === "marcus" ? ["BT6-025"] : [] },
              { card: "BT12-034", as: "agumon", under: attacker === "agumon" ? ["BT6-025"] : [] },
            ],
          },
          1: { battleArea: [{ card: "BT18-059", as: "zenimon" }], security: [...OPPONENT_SECURITY] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await treatMarcusAsDigimon(s);
      const memoryBeforeAttack = s.state.memory;
      expect(attackPlayer(s, attacker)).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      return s.state.memory - memoryBeforeAttack;
    }

    expect(await memoryGainedByAttack("marcus")).toBe(1);
    expect(await memoryGainedByAttack("agumon")).toBe(0);
  });

  it.fails("does not affect an opponent's Digimon that isn't affected by Digimon effects when it resolves an effect as a Digimon (Q5980)", async () => {
    // Tommy Himi is a Tamer card, so the [When Attacking] effect is a Digimon effect only because
    // Marcus, the Digimon that has it, is treated as both a Tamer and a Digimon.
    async function attackChoosing(chosen: "fanglongmon" | "kabuterimon") {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-092", as: "marcus", under: ["BT7-086"] },
              { card: "BT12-034", as: "agumon" },
            ],
          },
          1: {
            battleArea: [
              { card: "EX5-074", as: "fanglongmon" },
              { card: "BT15-047", as: "kabuterimon" },
            ],
            security: [...OPPONENT_SECURITY],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      await s.ready();
      await treatMarcusAsDigimon(s);
      preferInstanceIds.push(s.perm(chosen).topCard.instanceId);

      expect(attackPlayer(s, "marcus")).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      const view = observe(s.engine);
      return {
        fanglongmon: view.isRestricted(s.perm("fanglongmon"), "attack"),
        kabuterimon: view.isRestricted(s.perm("kabuterimon"), "attack"),
      };
    }

    expect(await attackChoosing("kabuterimon")).toEqual({ fanglongmon: false, kabuterimon: true });
    expect((await attackChoosing("fanglongmon")).fanglongmon).toBe(false);
  });
});
