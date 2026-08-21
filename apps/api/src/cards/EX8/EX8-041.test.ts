import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-041.js";

describe("EX8-041", () => {
  it("suspends an opposing Tamer and prevents it from unsuspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1 } },
      { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toHaveLength(2);
  });
  it("suspends an opposing Tamer and prevents its unsuspension in a live On Play resolution", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-041", as: "dark" }] },
        1: { battleArea: [{ card: "BT1-087", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dark").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea[0]!.isSuspended && observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend"),
    );
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
  });
});
