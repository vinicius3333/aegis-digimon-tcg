import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-115.js";

describe("P-115 SkullKnightmon", () => {
  it("plays an errata-eligible Amano Tamer and Saves itself under that Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-115", as: "skull" }],
          hand: [
            { card: "BT10-092", as: "nene" },
            { card: "P-224", as: "unrelated" },
          ],
          trash: [{ card: "BT10-093", as: "yuu" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const skullId = s.perm("skull").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("skull").permanentId])).toBe(1);
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("nene").instanceId) &&
        s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("nene").instanceId)!.stack.some(
          (card) => card.instanceId === skullId,
        ),
    );
    const nene = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("nene").instanceId)!;
    expect(nene.stack.some((card) => card.instanceId === skullId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yuu").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("unrelated").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
