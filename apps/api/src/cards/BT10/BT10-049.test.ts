import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-049.js";

describe("BT10-049 Ballistamon", () => {
  it("gains Blocker on the opponent's turn while another Xros Heart permanent is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-049", as: "source" }, "BT10-087"] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
  });

  it("grants Piercing only while its host has Shoutmon in its name", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-049"] }] } });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).hasPierce(matching.perm("host"))).toBe(true);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-049"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).hasPierce(other.perm("host"))).toBe(false);
  });

  it("may Save itself under a Tamer when deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-049", as: "source" }, { card: "BT10-087", as: "tamer" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const sourceId = s.perm("source").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId])).toBe(1);
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === sourceId));

    expect(s.perm("tamer").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(false);
  });
});
