import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-050.js";

describe("EX7-050", () => {
  it("reduces the cost of its Dark Dragon or Evil Dragon digivolution by 1", () =>
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      actions: [{ mode: "reduceCost", amount: 1 }],
    }));
  it("inherits a permanent +2000 DP effect during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));

  it("publicly reduces a legal Dark Dragon digivolution by 1 memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-050", as: "imp" }], hand: [{ card: "BT11-079", as: "evolving" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("imp").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imp").topCard.cardId === "BT11-079");
    expect(s.state.memory).toBe(2);
  });

  it("publicly grants inherited DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-042", as: "host", under: ["EX7-050"], dp: 4000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(observe(s.engine).effectiveNames(s.perm("host"))).toContain("jazardmon");
  });

  it("does not reduce a Dark Dragon digivolution from the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX7-050", as: "imp" },
        hand: [{ card: "BT11-079", as: "evolving" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("imp").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("imp").topCard?.cardId === "BT11-079");
    expect(s.perm("imp").topCard?.cardId).toBe("BT11-079");
    expect(s.state.memory).toBe(1);
  });
});
