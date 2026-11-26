import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, setupEngine, type EngineSetup } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD04-07";
const vanilla = "BT1-009";
const vanillaMega = "ST1-10";
const purpleCostSix = "BT13-109";
const purpleYellowCostSix = "BT16-100";
const purpleCostSeven = "BT11-109";
const yellowCostSix = "BT1-107";

function boardWithTrash(trash: string[]) {
  return setupEngine(
    {
      0: { battleArea: [{ card: vanillaMega, as: "attacker", under: [cardId] }], trash },
      1: { security: [vanilla, vanilla, vanilla] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
}

async function attackPlayer(s: EngineSetup) {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await drainMicrotasks(40);
  await advance(s.engine).finishAttack();
}

function handCardIds(s: EngineSetup) {
  return s.state.players[0]!.hand.map((card) => card.cardId);
}

describe("BD04-07 Digitamamon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD04",
      nameEn: "Digitamamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      types: ["Perfect"],
      effectText: "＜Jamming＞ (This Digimon can't be deleted in battles against Security Digimon.)",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] Return 1 purple Option card with a use cost of 6 from your trash to the hand.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "digitamamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("digitamamon"), "Jamming")).toBe(true);
  });

  it("survives a battle against a stronger Security Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "attacker" }] },
        1: { security: [vanillaMega, vanilla] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await attackPlayer(s);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([cardId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("returns only a purple Option with a use cost of 6 when its host attacks", async () => {
    const s = boardWithTrash([purpleCostSeven, yellowCostSix, purpleCostSix]);
    await s.ready();

    await attackPlayer(s);

    expect(handCardIds(s)).toEqual([purpleCostSix]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(
      [purpleCostSeven, yellowCostSix].sort(),
    );
  });

  it("accepts a multicolor purple Option with a use cost of 6", async () => {
    const s = boardWithTrash([purpleYellowCostSix]);
    await s.ready();

    await attackPlayer(s);

    expect(handCardIds(s)).toEqual([purpleYellowCostSix]);
  });

  it("returns a card only once per turn", async () => {
    const s = boardWithTrash([purpleCostSix, purpleCostSix]);
    await s.ready();

    await attackPlayer(s);
    s.perm("attacker").isSuspended = false;
    await attackPlayer(s);

    expect(handCardIds(s)).toEqual([purpleCostSix]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
