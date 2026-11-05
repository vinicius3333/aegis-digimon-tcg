import fixtureLordknightmonBt22EffectAttackReveal from "../../api/src/engine/scenarios/lordknightmon-bt22-effect-attack-reveal.fixture";
import fixtureLordknightmonBt22OpponentAttackReveal from "../../api/src/engine/scenarios/lordknightmon-bt22-opponent-attack-reveal.fixture";
import fixtureLordknightmonEx13DarkknightmonDigixros from "../../api/src/engine/scenarios/lordknightmon-ex13-darkknightmon-digixros.fixture";
import { fixturePermanentId, fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

// Discord 1558289910425985055 (BT22-067) and 1558289219074654299 (EX13-064), re-checked through
// the real GameScreen on boards the first investigation did not cover.

const RIZEGREYMON = fixturePermanentId("own-lk-effect-attack-rizegreymon");
const EFFECT_ATTACK_LORDKNIGHTMON = fixtureInstanceId("lk-effect-attack-hand-lordknightmon-card");
const EFFECT_ATTACK_SKULLKNIGHTMON = fixtureInstanceId("lk-effect-attack-deck-0-2-card");
const OPPONENT_ATTACKER = fixturePermanentId("opponent-lk-opponent-attack-agumon");
const OPPONENT_ATTACK_SKULLKNIGHTMON = fixtureInstanceId("lk-opponent-attack-deck-0-0-card");
const DIGIXROS_KNIGHTMON = fixturePermanentId("own-lk-digixros-knightmon");
const DIGIXROS_SKULLKNIGHTMON = fixtureInstanceId("lk-digixros-hand-skullknightmon-card");
const DIGIXROS_DEADLYAXEMON = fixtureInstanceId("lk-digixros-hand-deadlyaxemon-card");
const DIGIXROS_DARKKNIGHTMON = fixtureInstanceId("lk-digixros-trash-darkknightmon-card");

const isRevealPick = (decision: { sourceCardId?: string; kind: string; options: { min?: number } }) =>
  decision.sourceCardId === "BT22-067" && decision.kind === "selectCards" && decision.options.min === 0;

test("BT22 LordKnightmon reveal offers SkullKnightmon during its own [When Digivolving] attack", async ({
  scenario,
}) => {
  test.setTimeout(120_000);
  await scenario.openFixture(fixtureLordknightmonBt22EffectAttackReveal);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.evolve("LordKnightmon", RIZEGREYMON, true);

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      !s.pendingDecision &&
      !s.combatWindow &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === EFFECT_ATTACK_SKULLKNIGHTMON) &&
      s.players[1]!.securityCount < 4,
    (decision) => {
      if (decision.sourceCardId === "BT22-067" && decision.kind === "optional") return { accept: true };
      if (decision.options.selectionContext === "attackTarget") {
        expect(decision.options).toMatchObject({ min: 0, max: 1, candidateInstanceIds: ["player"] });
        return { instanceId: "player" };
      }
      if (isRevealPick(decision)) {
        offered.push([...decision.options.candidateInstanceIds!]);
        return { instanceId: EFFECT_ATTACK_SKULLKNIGHTMON };
      }
      if (decision.kind === "optional") return { accept: false };
      if (decision.kind === "selectCards" && decision.options.min === 0) return { accept: false };
      return {};
    },
  );

  expect(offered).toEqual([[EFFECT_ATTACK_SKULLKNIGHTMON]]);
  const after = await scenario.snapshot();
  expect(after.memory).toBe(0);
  expect(after.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([
    EFFECT_ATTACK_LORDKNIGHTMON,
    EFFECT_ATTACK_SKULLKNIGHTMON,
  ]);
  expect(after.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT5-042", "EX13-058"]);
  await scenario.healthy();
});

test.describe("BT22 LordKnightmon reveal on the opponent's attack", () => {
  test.use({
    holdBotAfterTurn: 2,
    botMainIntents: [
      [{ type: "attack", attackerPermanentId: OPPONENT_ATTACKER, target: { kind: "player" } }, { type: "endPhase" }],
      { scope: "test" },
    ],
  });

  test("the owner picks the revealed SkullKnightmon during the opponent's turn", async ({ scenario, page }) => {
    test.setTimeout(120_000);
    await scenario.openFixture(fixtureLordknightmonBt22OpponentAttackReveal, "normal", "none");

    const offered: string[][] = [];
    await scenario.resolveUntil(
      (s) =>
        !s.pendingDecision &&
        !s.combatWindow &&
        s.turnSeat === 0 &&
        s.turnCount === 2 &&
        s.phase === "Breeding" &&
        s.players[0]!.battleArea.some((p) => p.topCard.instanceId === OPPONENT_ATTACK_SKULLKNIGHTMON) &&
        s.players[0]!.securityCount < 4,
      (decision) => {
        if (isRevealPick(decision)) {
          offered.push([...decision.options.candidateInstanceIds!]);
          return { instanceId: OPPONENT_ATTACK_SKULLKNIGHTMON };
        }
        if (decision.kind === "optional") return { accept: false };
        if (decision.kind === "selectCards" && decision.options.min === 0) return { accept: false };
        return {};
      },
    );

    expect(offered).toEqual([[OPPONENT_ATTACK_SKULLKNIGHTMON]]);
    const after = await scenario.snapshot();
    expect(after.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT5-042", "EX13-058"]));
    expect(after.players[0]!.securityCount).toBe(3);
    await expect(page.getByRole("button", { name: "End breeding", exact: true })).toBeEnabled();
    await scenario.healthy();
  });
});

test("EX13 LordKnightmon plays DarkKnightmon from the trash with DigiXros materials from hand", async ({
  scenario,
  page,
}) => {
  test.setTimeout(120_000);
  await scenario.openFixture(fixtureLordknightmonEx13DarkknightmonDigixros);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  await scenario.evolve("LordKnightmon", DIGIXROS_KNIGHTMON);

  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) => JSON.parse(s.pendingDecision?.payloadJson || "{}").digiXrosCardId === "EX10-031",
    (decision) => {
      if (decision.sourceCardId === "EX13-064" && decision.kind === "selectCards") {
        offered.push([...decision.options.candidateInstanceIds!].sort());
        return { instanceId: DIGIXROS_DARKKNIGHTMON };
      }
      return {};
    },
  );
  expect(offered).toEqual([[DIGIXROS_DARKKNIGHTMON, DIGIXROS_DEADLYAXEMON, DIGIXROS_SKULLKNIGHTMON].sort()]);

  const picker = page.getByRole("dialog");
  await picker.getByRole("button", { name: /^SkullKnightmon/ }).click();
  await picker.getByRole("button", { name: /^DeadlyAxemon/ }).click();
  await picker.getByRole("button", { name: "DigiXros (2 cards)", exact: true }).click();

  await scenario.resolveUntil(
    (s) => !s.pendingDecision && s.players[0]!.battleArea.some((p) => p.topCard.instanceId === DIGIXROS_DARKKNIGHTMON),
    (decision) => (decision.kind === "optional" ? { accept: false } : {}),
  );
  const after = await scenario.snapshot();
  expect(after.memory).toBe(0);
  const darkKnightmon = after.players[0]!.battleArea.find((p) => p.topCard.instanceId === DIGIXROS_DARKKNIGHTMON)!;
  expect(darkKnightmon.stack.map((card) => card.instanceId).sort()).toEqual(
    [DIGIXROS_DEADLYAXEMON, DIGIXROS_SKULLKNIGHTMON].sort(),
  );
  expect(after.players[0]!.trash).toHaveLength(0);
  await scenario.healthy();
});
