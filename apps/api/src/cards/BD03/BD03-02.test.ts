import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "BD03-02";
const greymonHost = "ST1-09";
const nonGreymonHost = "BT8-017";
const blackLevel4 = "BT10-062";
const redLevel4 = "BT2-014";
const dp3000 = "BT1-009";
const dp4000 = "BT1-014";

function customEffectGrants(s: ReturnType<typeof setupEngine>) {
  return (
    s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    }
  ).continuous.listCustomEffectGrants();
}

async function endOfTurnBoard(host: PermanentSpec, opponentBattleArea: PermanentSpec[]) {
  const s = setupEngine(
    { 0: { battleArea: [host] }, 1: { battleArea: opponentBattleArea } },
    { autoSelectCards: true },
  );
  await s.ready();
  return s;
}

function opponentCardIds(s: ReturnType<typeof setupEngine>) {
  return s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId);
}

describe("BD03-02 MetalGreymon: Alterous Mode", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "MetalGreymon: Alterous Mode",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 3 },
        { color: "Black", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      rarity: "C",
      effectText:
        '[Start of Your Main Phase] Give 1 of your opponent\'s Digimon "[On Deletion] Lose 1 memory." for the turn.',
      inheritedEffectText:
        "[End of Your Turn][Once Per Turn] If this Digimon has [Greymon] in its name, delete 1 of your opponent's Digimon with 3000 DP or less.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it.each([
    ["red", redLevel4],
    ["black", blackLevel4],
  ])("digivolves from a %s level 4 Digimon for 3 memory", async (_color, base) => {
    const s = setupEngine({
      0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: cardId, as: "alterous" }], deck: [dp3000] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("alterous").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
    expect(s.state.memory).toBe(2);
  });

  it("gives the chosen opponent Digimon a lose-1-memory On Deletion effect at the start of your main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "alterous" }] },
        1: {
          battleArea: [
            { card: dp3000, as: "recipient" },
            { card: dp4000, as: "bystander" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 3;
    await s.ready();
    const recipient = s.perm("recipient");
    const bystander = s.perm("bystander");

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("alterous"));
    await settle(() => customEffectGrants(s).length > 0);

    expect(customEffectGrants(s)).toHaveLength(1);
    const grantedInstanceId = customEffectGrants(s)[0]!.instanceId;
    expect(customEffectGrants(s)[0]!.token).toBe("[On Deletion] Lose 1 memory.");
    expect([recipient.topCard.instanceId, bystander.topCard.instanceId]).toContain(grantedInstanceId);
    const granted = grantedInstanceId === recipient.topCard.instanceId ? recipient : bystander;
    const other = granted === recipient ? bystander : recipient;

    await advance(s.engine).verb.deletePermanent([other.permanentId], "byEffect");
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === other.permanentId),
    );
    expect(s.state.memory).toBe(3);

    await advance(s.engine).verb.deletePermanent([granted.permanentId], "byEffect");
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
  });

  it("gives the On Deletion effect only for the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "alterous" }], deck: [dp3000, dp3000] },
        1: { battleArea: [{ card: dp3000, as: "recipient" }], deck: [dp3000, dp3000] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => customEffectGrants(s).length > 0);
    expect(customEffectGrants(s).map((grant) => grant.instanceId)).toEqual([s.perm("recipient").topCard.instanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(customEffectGrants(s)).toHaveLength(0);
  });

  it("deletes an opponent's Digimon with 3000 DP or less at the end of your turn under a Greymon host", async () => {
    const s = await endOfTurnBoard({ card: greymonHost, as: "host", under: [cardId] }, [
      { card: dp4000, as: "tooBig" },
      { card: dp3000, as: "target" },
    ]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(opponentCardIds(s)).toEqual([dp4000]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([dp3000]);
  });

  it("deletes only once per turn", async () => {
    const s = await endOfTurnBoard({ card: greymonHost, as: "host", under: [cardId] }, [
      { card: dp3000, as: "first" },
      { card: dp3000, as: "second" },
    ]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes nothing under a host without Greymon in its name", async () => {
    const s = await endOfTurnBoard({ card: nonGreymonHost, as: "host", under: [cardId] }, [
      { card: dp3000, as: "target" },
    ]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle();

    expect(opponentCardIds(s)).toEqual([dp3000]);
  });

  it("deletes nothing while MetalGreymon: Alterous Mode is the top card", async () => {
    const s = await endOfTurnBoard({ card: cardId, as: "host", under: [redLevel4] }, [{ card: dp3000, as: "target" }]);

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle();

    expect(opponentCardIds(s)).toEqual([dp3000]);
  });
});
