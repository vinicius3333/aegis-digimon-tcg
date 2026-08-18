import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT7-030.js";

describe("BT7-030 AncientMegatheriummon", () => {
  it("may play a blue level-4-or-lower Hybrid from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-030", as: "ancient" }],
          hand: [{ card: "BT7-023", as: "hybrid" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hybrid").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("hybrid").instanceId)).toBe(true);
  });

  it("trashes one bottom source per Hybrid source from every opposing Digimon, then draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-011", under: ["BT7-023", "BT7-025"], as: "base" }],
        hand: [{ card: "BT7-030", as: "evolving" }],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", under: ["BT1-001", "BT1-002", "BT1-003"], as: "first" },
          { card: "BT1-009", under: ["BT1-004", "BT1-005"], as: "second" },
        ],
      },
    }, { autoSelectCards: true });
    const mine = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });

    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT7-030"));
    expect(opponent.trash).toHaveLength(4);
    expect(s.perm("first").stack).toHaveLength(1);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(mine.hand).toHaveLength(3);
  });
});
