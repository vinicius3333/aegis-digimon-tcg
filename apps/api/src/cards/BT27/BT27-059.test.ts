import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { compiled } from "./BT27-059.js";
import "#api/cards/index";

const cardId = "BT27-059";
const DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-019"];

function clockmonBoard() {
  return {
    0: {
      battleArea: [
        { card: cardId, as: "clockmon" },
        { card: "BT10-062", as: "ally", under: ["BT5-061"] },
      ],
      deck: DECK,
    },
    1: { battleArea: [{ card: "BT1-019", as: "rival", under: ["BT1-009"] }], deck: DECK },
  };
}

async function opponentDeDigivolves(s: ReturnType<typeof setupEngine>, alias: string) {
  advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
  await advance(s.engine).verb.deDigivolve(s.perm(alias).permanentId, 1);
  advance(s.engine).verb.leaveEffectResolution();
  await settle(() => !s.state.pendingDecision);
}

describe("Clockmon De-Digivolve shield, counter De-Digivolve, and inherited unsuspend", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Clockmon",
      nameJp: "クロックモン",
      colors: ["Black"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Machine"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.isInherited ?? false])).toEqual([
      ["Static", false],
      ["OnPlay", false],
      ["WhenDigivolving", false],
      ["OpponentsTurn", true],
    ]);
  });

  it("has ＜Blocker＞", async () => {
    const s = setupEngine(clockmonBoard());
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("clockmon"), "Blocker")).toBe(true);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s on your turn shields 1 of your Digimon from the opponent's De-Digivolve without counterattacking",
    async (timing) => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(clockmonBoard(), { autoSelectCards: true, preferInstanceIds });
      preferInstanceIds.push(s.perm("ally").topCard.instanceId);
      await s.ready();
      await advance(s.engine).fire(timing, s.perm("clockmon"));
      await settle(() => !s.state.pendingDecision);
      expect(s.perm("rival").topCard.cardId).toBe("BT1-019");

      await opponentDeDigivolves(s, "ally");
      expect(s.perm("ally").topCard.cardId).toBe("BT10-062");
    },
  );

  it("does not stop your own De-Digivolve on the shielded Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(clockmonBoard(), { autoSelectCards: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("clockmon"));
    await settle(() => !s.state.pendingDecision);
    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.deDigivolve(s.perm("ally").permanentId, 1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("ally").topCard.cardId).toBe("BT5-061");
  });

  it("leaves an unshielded Digimon open to the opponent's De-Digivolve", async () => {
    const s = setupEngine(clockmonBoard(), { autoSelectCards: true });
    await s.ready();
    await opponentDeDigivolves(s, "ally");
    expect(s.perm("ally").topCard.cardId).toBe("BT5-061");
  });

  it("On Play during the opponent's turn also De-Digivolves 1 of their Digimon", async () => {
    const s = setupEngine(clockmonBoard(), { autoSelectCards: true });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("clockmon"));
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("rival").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-019"]);
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    "inherited: accepting %s unsuspends the host when your Digimon suspend on the opponent's turn",
    async (accept, suspended) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT10-062", as: "host", under: [cardId] }], deck: DECK },
          1: { deck: DECK },
        },
        accept ? { autoAcceptOptional: true } : { autoDeclineOptional: true },
      );
      await s.ready();
      s.state.turnSeat = 1;
      await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
      await settle(() => !s.state.pendingDecision);
      expect(s.perm("host").isSuspended).toBe(suspended);
    },
  );

  it("inherited unsuspend works once per turn and never on your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-062", as: "host", under: [cardId] }], deck: DECK },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("host").isSuspended).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("host").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => !s.state.pendingDecision);
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
