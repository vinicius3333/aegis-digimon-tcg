import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-071.js";

describe("BT4-071 Tankdramon", () => {
  it("reveals 2 and may play a Commandramon when another D-Brigade Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-071", as: "tank" },
            { card: "BT4-063", as: "brigade" },
          ],
          deck: ["BT4-063", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const deletedId = s.perm("brigade").permanentId;
    await (s.engine as any).primitives.deletePermanent([deletedId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-063" && p.permanentId !== deletedId),
    );

    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-063" && p.permanentId !== deletedId),
    ).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
