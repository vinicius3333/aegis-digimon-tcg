import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-115.js";

describe("P-115 SkullKnightmon", () => {
  it("grants Security Attack +1 to a level-5 Bagra Army/Twilight host on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-066", as: "host", under: ["P-115"] }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    assertNoLoudGap(s);
  });

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
    await s.ready();

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
