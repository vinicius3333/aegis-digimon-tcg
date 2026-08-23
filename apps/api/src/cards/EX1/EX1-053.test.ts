import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-053.js";

describe("EX1-053 MetalEtemon", () => {
  it("gets +1000 DP per Etemon card in trash on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-053", as: "metalEtemon", dp: 11000 }], trash: ["EX1-052", "EX1-053"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("metalEtemon").currentDP).toBe(13000);
  });

  it("de-digivolves an opposing Digimon by 1 on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-053", as: "metalEtemon" }] },
        1: { battleArea: [{ card: "EX1-054", as: "target", under: [{ card: "EX1-050", as: "revealed" }] }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("metalEtemon").permanentId], "byEffect");
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("revealed").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX1-054")).toBe(true);
  });
});
