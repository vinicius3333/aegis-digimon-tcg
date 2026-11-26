import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { attackPlayer } from "#api/engine/testkit/attackPlayer";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";

const cardId = "BD01-08";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel5 = "BT1-020";
const vanillaYellowLevel4 = "BT1-051";
const vanillaYellowLevel5 = "BT1-057";

function buildDecks() {
  return Array.from({ length: 6 }, () => vanillaRedLevel3);
}

describe("BD01-08 MagnaAngemon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD01",
      nameEn: "MagnaAngemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 6000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Archangel"],
      rarity: "C",
      effectText: "[When Digivolving] 1 of your opponent's Digimon gets -3000 DP for the turn.",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] Give 1 of your opponent's Digimon ＜Security A. -1＞ until their turn ends. (This Digimon checks 1 fewer security cards.)",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("digivolves from a yellow level 4 Digimon for 3 memory and gives 1 opposing Digimon -3000 DP for the turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaYellowLevel4, as: "base" }],
          hand: [{ card: cardId, as: "magnaangemon" }],
          deck: buildDecks(),
        },
        1: {
          battleArea: [
            { card: vanillaRedLevel5, as: "chosen" },
            { card: vanillaRedLevel5, as: "other" },
          ],
          deck: buildDecks(),
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 5;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnaangemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 3000);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([vanillaYellowLevel4]);
    expect(s.state.memory).toBe(2);
    expect(s.perm("chosen").currentDP).toBe(6000 - 3000);
    expect(s.perm("other").currentDP).toBe(6000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("chosen").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });

  it("inherits Security A. -1 for 1 opposing Digimon when attacking, through the end of the opponent's turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: vanillaYellowLevel5, as: "host", under: [cardId] }], deck: buildDecks() },
        1: {
          battleArea: [
            { card: vanillaRedLevel3, as: "chosen" },
            { card: vanillaRedLevel3, as: "other" },
          ],
          security: [vanillaRedLevel3, vanillaRedLevel3],
          deck: buildDecks(),
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("host") });

    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);

    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });

  it("gives Security A. -1 only once per turn across two attacks", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: vanillaYellowLevel5, as: "host", under: [cardId] }] },
        1: {
          battleArea: [
            { card: vanillaRedLevel3, as: "first" },
            { card: vanillaRedLevel3, as: "second" },
          ],
          security: [vanillaRedLevel3, vanillaRedLevel3, vanillaRedLevel3],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("first").topCard.instanceId);
    await s.ready();

    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("host") });
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);

    preferInstanceIds.splice(0, 1, s.perm("second").topCard.instanceId);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("host") });

    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not use its inherited effect while MagnaAngemon itself is the top card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "magnaangemon", under: [vanillaYellowLevel4] }] },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "target" }], security: [vanillaRedLevel3] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await attackPlayer({ setup: s, seat: 0, attacker: s.perm("magnaangemon") });

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});
