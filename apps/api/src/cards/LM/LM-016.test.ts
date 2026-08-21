import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-016.js";

describe("LM-016 Gammamon", () => {
  it("plays Hiro Amanokawa from hand when the inherited Gammamon effect is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-001", as: "stack", under: ["LM-016"] }],
        hand: [{ card: "BT21-080", as: "hiro" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("stack").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT21-080"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT21-080")).toBe(true);
  });
});
