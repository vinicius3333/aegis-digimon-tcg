import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-069.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-069", () => {
  it("inherits one memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));
  it("gains one memory when its host is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-069"] }] } });
    s.state.memory = 3;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
  });

  it("naturally gains one memory when its host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-058", as: "host", under: ["BT14-069"] }] },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 12000 }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-058")).toBe(true);
    expect(s.state.memory).toBe(4);
  });
});
