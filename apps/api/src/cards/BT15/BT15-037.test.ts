import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT15-037 Gatomon", () => {
  it("plays itself when an effect directly trashes it from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT15-037", as: "gatomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-037"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-037")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT15-037")).toBe(false);
    assertNoLoudGap(s);
  });

  it("gains exactly 1 memory when another effect removes a card from its security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-037", as: "gatomon" }],
        security: ["BT1-085"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
