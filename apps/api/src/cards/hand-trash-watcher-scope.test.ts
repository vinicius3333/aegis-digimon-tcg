import { describe, expect, it } from "vitest";
import { advance } from "../engine/testkit/advance.js";
import { setupEngine } from "../engine/testkit/harness.js";
import { observe } from "../engine/testkit/observe.js";
import "./BT6/BT6-006.js";
import "./BT6/BT6-069.js";
import "./BT6/BT6-073.js";
import "./BT6/BT6-081.js";
import "./BT7/BT7-077.js";

describe("hand-trash watcher scope", () => {
  it("requires the controller's effect for the BT6 inherited and Titamon payoffs", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", under: ["BT6-006"], as: "tsunomonHost" },
          { card: "BT1-081", under: ["BT6-069"], as: "goblimonHost" },
          { card: "BT1-081", under: ["BT6-073"], as: "ginkakumonHost" },
          { card: "BT6-081", as: "titamon" },
        ],
        hand: [
          { card: "BT1-009", as: "opponentCausedTrash" },
          { card: "BT1-010", as: "ownerCausedTrash" },
        ],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const goblimonBaseDP = s.perm("goblimonHost").currentDP;
    const titamonBaseDP = s.perm("titamon").currentDP;

    await advance(s.engine).verb.trash([s.inst("opponentCausedTrash").instanceId], 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    expect(s.perm("goblimonHost").currentDP).toBe(goblimonBaseDP);
    expect(s.perm("titamon").currentDP).toBe(titamonBaseDP);

    await advance(s.engine).verb.trash([s.inst("ownerCausedTrash").instanceId], 0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("goblimonHost").currentDP).toBe(goblimonBaseDP + 2_000);
    expect(s.perm("titamon").currentDP).toBe(titamonBaseDP + 2_000);
    expect(observe(s.engine).keywordAmount(s.perm("titamon"), "SecurityAttack")).toBe(1);
  });

  it("makes each Nidhoggmon react only when that exact copy is trashed by its owner's effect", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT1-009", as: "unrelated" },
          { card: "BT7-077", as: "opponentTrashedNidhoggmon" },
          { card: "BT7-077", as: "firstOwnerTrashedNidhoggmon" },
          { card: "BT7-077", as: "secondOwnerTrashedNidhoggmon" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("unrelated").instanceId], 0);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.trash([s.inst("opponentTrashedNidhoggmon").instanceId], 1);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.trash([s.inst("firstOwnerTrashedNidhoggmon").instanceId], 0);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.trash([s.inst("secondOwnerTrashedNidhoggmon").instanceId], 0);
    expect(s.state.memory).toBe(2);
  });
});
