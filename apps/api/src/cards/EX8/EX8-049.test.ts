import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-049.js";

describe("EX8-049", () => {
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("de-digivolves an opposing Digimon by 1 on play and deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { count: 1 },
    });
  });
  it("removes one evolution card when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-049", as: "source" }] },
        1: { battleArea: [{ card: "EX8-048", as: "opponent", under: ["BT1-009", "BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049"));
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(1);
  });
  it("removes one evolution card when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-049", as: "source" }] },
        1: { battleArea: [{ card: "EX8-048", as: "opponent", under: ["BT1-009", "BT1-009"] }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[1]!.battleArea[0]!.stack.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(1);
  });

  it("grants Blocker to the live evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-080", as: "host", under: ["EX8-049"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
