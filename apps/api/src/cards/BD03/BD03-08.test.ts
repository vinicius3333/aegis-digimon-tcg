import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "BD03-08";
const pteromon = "BD03-03";
const galemon = "BD03-04";
const zephagamon = "BD03-07";
const blackBirdDragon = "ST5-02";
const redAvian = "BT1-013";
const blackMineral = "BT10-062";
const vanillaLevel3 = "BT1-009";

async function memoryAtMainPhaseWith(digimon: readonly string[]) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: cardId, as: "shoto" }, ...digimon.map((card, index) => ({ card, as: `digimon${index}` }))],
        deck: [vanillaLevel3, vanillaLevel3],
      },
    },
    { autoDeclineOptional: true },
  );
  s.state.memory = 3;
  await s.ready();
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  await drainMicrotasks(20);
  const memory = s.state.memory;
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  return memory;
}

function endOfTurnBoard(allies: PermanentSpec[], options: { suspendedTamer?: boolean; accept?: boolean } = {}) {
  const preferred: string[] = [];
  const s = setupEngine(
    { 0: { battleArea: [{ card: cardId, as: "shoto", suspended: options.suspendedTamer ?? false }, ...allies] } },
    {
      autoAcceptOptional: options.accept ?? true,
      autoDeclineOptional: options.accept === false,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    },
  );
  return { s, preferred };
}

describe("BD03-08 Shoto Kazama (Black)", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Shoto Kazama (Black)",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      rarity: "U",
      effectText:
        "[Start of Your Main Phase] If you have a Digimon with ＜Blocker＞, gain 1 memory.\n[End of Your Turn] By suspending this Tamer, 1 of your black Digimon with [Avian] or [Bird] in any of its traits gains ＜Reboot＞ until your opponent's turn ends. (This Digimon also unsuspends in your opponent's unsuspend phase.)",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory at the start of your main phase with a Digimon with Blocker", async () => {
    expect(await memoryAtMainPhaseWith([galemon])).toBe(4);
  });

  it("gains no memory without a Digimon with Blocker", async () => {
    expect(await memoryAtMainPhaseWith([blackBirdDragon])).toBe(3);
  });

  it("suspends itself to give Reboot to 1 of your black Digimon with Avian or Bird in a trait", async () => {
    const { s, preferred } = endOfTurnBoard([
      { card: zephagamon, as: "zephagamon" },
      { card: pteromon, as: "pteromon" },
      { card: blackBirdDragon, as: "birdDragon" },
      { card: redAvian, as: "redAvian" },
      { card: blackMineral, as: "mineral" },
    ]);
    await s.ready();
    preferred.push(s.perm("zephagamon").permanentId);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("zephagamon"), "Reboot"));

    const selection = s.decisions.find((decision) => decision.req.kind === "chooseTargets");
    expect([...(selection?.req.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.perm("zephagamon"), s.perm("pteromon"), s.perm("birdDragon")].map((permanent) => permanent.permanentId).sort(),
    );
    expect(s.perm("shoto").isSuspended).toBe(true);
    for (const alias of ["pteromon", "birdDragon", "redAvian", "mineral"]) {
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Reboot")).toBe(false);
    }
  });

  it("grants nothing when the suspension is declined", async () => {
    const { s } = endOfTurnBoard([{ card: pteromon, as: "pteromon" }], { accept: false });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    await settle();

    expect(s.perm("shoto").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("pteromon"), "Reboot")).toBe(false);
  });

  it("grants nothing while the Tamer is already suspended", async () => {
    const { s } = endOfTurnBoard([{ card: pteromon, as: "pteromon" }], { suspendedTamer: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("shoto"));
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("pteromon"), "Reboot")).toBe(false);
  });

  it("unsuspends the Reboot Digimon in the opponent's unsuspend phase, then Reboot ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "shoto" },
            { card: blackBirdDragon, as: "attacker" },
          ],
          deck: [vanillaLevel3, vanillaLevel3],
          security: [vanillaLevel3],
        },
        1: { deck: [vanillaLevel3, vanillaLevel3], security: [vanillaLevel3, vanillaLevel3] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Reboot")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.perm("shoto").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Reboot")).toBe(false);
  });

  it("plays itself without paying the cost when revealed as a security card", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "shoto" }] },
        1: { battleArea: [{ card: vanillaLevel3, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
  });
});
