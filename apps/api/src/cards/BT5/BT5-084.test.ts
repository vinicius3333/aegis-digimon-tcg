import { describe, it, expect } from "vitest";
import { EffectTiming, effectiveExactNames, isDigimon, requireCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-084.js";
import "./BT5-109.js";
import "../BT12/BT12-016.js";
describe("BT5-084 Diaboromon", () => {
  it("may play a white Diaboromon Token when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT5-084", as: "evolving" }] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId.includes("TOKEN"))!;
    expect(token.topCard.cardId).toBe("TOKEN-Diaboromon");
    expect(token.controllerSeat).toBe(0);
    expect(token.topCard.ownerSeat).toBe(0);
    expect(token.topCard.faceUp).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(requireCardDefinition(token.topCard.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      dp: 3000,
      playCost: 14,
      isToken: true,
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
    });
    expect(requireCardDefinition(token.topCard.cardId).colors).toContain("White");
  });
  it("may decline the optional Token effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT10-013", as: "base" }], hand: [{ card: "BT5-084", as: "evolving" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});

describe("BT5-084 Diaboromon — KB Q&A rulings", () => {
  async function digivolveIntoDiaboromon(playToken: boolean, opponentBoard: string[] = [], hand: string[] = []) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-013", as: "base" },
            { card: "BT1-009", as: "redDigimon", dp: 6000 },
          ],
          hand: [{ card: "BT5-084", as: "evolving" }, ...hand.map((card) => ({ card, as: card }))],
        },
        1: { battleArea: opponentBoard.map((card) => ({ card, as: card })) },
      },
      playToken ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-084");
    await settle();
    return s;
  }

  const findToken = (s: Awaited<ReturnType<typeof digivolveIntoDiaboromon>>) =>
    s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "TOKEN-Diaboromon");

  it("plays a token that is a Digimon named Diaboromon and can be targeted as a Digimon (Q1352)", async () => {
    const s = await digivolveIntoDiaboromon(true, ["BT12-016"]);
    const token = findToken(s)!;
    const tokenDefinition = requireCardDefinition(token.topCard.cardId);
    expect(isDigimon(tokenDefinition)).toBe(true);
    expect(effectiveExactNames(tokenDefinition)).toContain("Diaboromon");

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("BT12-016"));
    await settle(() => findToken(s) === undefined);

    expect(findToken(s)).toBeUndefined();
    expect(s.perm("base").topCard.cardId).toBe("BT5-084");
    expect(s.perm("redDigimon").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "TOKEN-Diaboromon")).toBe(false);
  });

  it("counts a Diaboromon token toward a white color requirement (Q1353)", async () => {
    const useWhiteOption = async (playToken: boolean) => {
      const s = await digivolveIntoDiaboromon(playToken, [], ["BT5-109"]);
      await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect");
      await settle();
      return { s, result: s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("BT5-109").instanceId }) };
    };

    const withToken = await useWhiteOption(true);
    expect(withToken.s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
      "BT1-009",
      "TOKEN-Diaboromon",
    ]);
    expect(withToken.result).toEqual({ ok: true });

    const withoutToken = await useWhiteOption(false);
    expect(withoutToken.s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(withoutToken.result).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });
});
