import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-001.js";
import "../index.js";

describe("EX4-001 Missimon", () => {
  it("draws 1 on deletion only while its owner still has a Digimon in play", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"] } },
    });
  });

  it("draws when its host is deleted while another own Digimon remains in play", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-001"] },
          { card: "BT1-009", as: "otherDigimon" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw when deletion removes the host that carried the egg", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-010"], battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-001"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
