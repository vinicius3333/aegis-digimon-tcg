import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-038.js";

describe("BT11-038 Angemon", () => {
  it("plays Devimon from trash on deletion while a purple Tamer remains in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-038", as: "angemon" }, "BT11-094"],
          trash: [{ card: "BT11-080", as: "devimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("angemon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("devimon").instanceId),
    );

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("devimon").instanceId);
  });

  it("Q2072: doesn't activate when the last purple card is deleted simultaneously", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-038", as: "angemon" },
            { card: "BT11-080", as: "purple" },
          ],
          trash: [{ card: "BT11-080", as: "devimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const devimonInstanceId = s.inst("devimon").instanceId;

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("angemon").permanentId, s.perm("purple").permanentId],
        "byEffect",
      ),
    ).toBe(2);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(devimonInstanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === devimonInstanceId)).toBe(false);
  });
});
