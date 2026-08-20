import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST14-07.js";

describe("ST14-07 Baalmon", () => {
  it("mills 3 and plays exactly Beelzemon from trash when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST14-07", as: "baalmon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          trash: [
            ...Array.from({ length: 6 }, () => "BT1-009"),
            { card: "ST14-10", as: "blast" },
            { card: "ST14-08", as: "beelzemon" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("baalmon"));
    await advance(s.engine).verb.deletePermanent([s.perm("baalmon").permanentId]);

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "ST14-08")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "ST14-10")).toBe(true);
  });

  it("gives its Wizard or Demon Lord host +2000 DP during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST14-08", as: "host", under: ["ST14-07"] }] } });
    const baseDp = s.perm("host").currentDP;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
  });
});
