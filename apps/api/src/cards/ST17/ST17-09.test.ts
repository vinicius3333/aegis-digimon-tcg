import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-09 Cherubimon", () => {
  it("has Alliance, deletes an opposing level 4 Digimon, and plays a qualifying card from trash for free", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-09", as: "cherubimon" }],
        trash: [{ card: "ST17-04", as: "revived" }, { card: "BT1-009", as: "wrongColor" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("cherubimon"), "Alliance")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("cherubimon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-04")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
