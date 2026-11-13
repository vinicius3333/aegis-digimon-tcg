import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { compiled } from "./BT27-001.js";
import "#api/cards/index";

const cardId = "BT27-001";
const DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-019"];

function gurimonBoard(host: string, others: { card: string; as: string }[] = []) {
  const s = setupEngine({
    0: { battleArea: [{ card: host, as: "host", under: [cardId] }, ...others], deck: DECK },
    1: { deck: DECK },
  });
  return s;
}

async function suspend(s: ReturnType<typeof setupEngine>, alias: string) {
  await advance(s.engine).verb.suspend([s.perm(alias).permanentId]);
  await settle(() => !s.state.pendingDecision);
}

describe("Gurimon inherited draw when Huckmon text Digimon suspend", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Gurimon",
      nameJp: "グリモン",
      colors: ["Red"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your Digimon with [Huckmon] in their texts suspend, ＜Draw 1＞.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((effect) => [effect.trigger, effect.isInherited, effect.frequency])).toEqual([
      ["YourTurn", true, "OncePerTurn"],
    ]);
  });

  it.each([
    ["a Digimon named Huckmon", "BT7-009", 1],
    ["a Digimon with [Huckmon] only in its text", "BT20-057", 1],
    ["a Digimon without [Huckmon] in its text", "BT10-062", 0],
  ])("draws when the host is %s and suspends", async (_label, host, draws) => {
    const s = gurimonBoard(host);
    await s.ready();
    await suspend(s, "host");
    expect(s.state.players[0]!.hand).toHaveLength(draws);
  });

  it("draws when another Huckmon text Digimon of yours suspends", async () => {
    const s = gurimonBoard("BT10-062", [{ card: "BT7-009", as: "huckmon" }]);
    await s.ready();
    await suspend(s, "huckmon");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("draws only once per turn", async () => {
    const s = gurimonBoard("BT7-009", [{ card: "BT13-009", as: "huckmon" }]);
    await s.ready();
    await suspend(s, "host");
    await suspend(s, "huckmon");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw on the opponent's turn", async () => {
    const s = gurimonBoard("BT7-009");
    await s.ready();
    s.state.turnSeat = 1;
    await suspend(s, "host");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw while Gurimon is only in the breeding area", async () => {
    const s = setupEngine({
      0: { breeding: { card: cardId, as: "egg" }, battleArea: [{ card: "BT7-009", as: "huckmon" }], deck: DECK },
      1: { deck: DECK },
    });
    await s.ready();
    await suspend(s, "huckmon");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
