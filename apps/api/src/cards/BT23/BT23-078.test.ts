import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT23-078.js";

describe("BT23-078 Gorou Matayoshi", () => {
  it("returns this Tamer and buffs one of your Digimon after a qualifying play trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-078", as: "gorou" },
            { card: "BT23-017", as: "ally" },
            { card: "BT23-006", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078")).toBe(true);
    expect(s.perm("ally").currentDP).toBe(4000);
  });

  it("excludes Sea Animal-only Digimon from the trait gate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-078", as: "gorou" },
          { card: "BT1-033", as: "subject" },
        ],
      },
    });
    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("subject").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-078")).toBe(false);
  });
});
