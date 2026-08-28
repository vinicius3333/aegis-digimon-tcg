import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT16-073.js";
import "../index.js";

describe("BT16-073", () => {
  it("models Retaliation and draws two then trashes two on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      keywords: [{ keyword: "Retaliation" }],
      actions: [
        { kind: "Draw", amount: 2 },
        { kind: "Trash", target: { count: 2 } },
      ],
    });
  });

  it("plays a Myotismon-text Tamer from trash on deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          optional: true,
          abortOnDecline: true,
          notSameNameAs: ["battleArea"],
          target: { count: 1, filter: { kind: ["Tamer"], controller: "mine", textContains: "[Myotismon]" } },
          from: ["trash"],
        },
      ],
    });
  });

  it("plays an eligible Myotismon-text Tamer from trash when accepted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-073", as: "mummy" }], trash: [{ card: "BT16-089", as: "kosuke" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("mummy").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-089"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-089")).toBe(true);
  });

  it("does not play a same-name Myotismon-text Tamer already in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-073", as: "first" },
            { card: "BT16-073", as: "second" },
            { card: "BT8-093", as: "existingTamer" },
          ],
          trash: ["BT8-093", "BT8-093"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent(
      [s.perm("first").permanentId, s.perm("second").permanentId],
      "byEffect",
    );
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT8-093").length === 1,
    );

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT8-093")).toHaveLength(1);
  });
});
