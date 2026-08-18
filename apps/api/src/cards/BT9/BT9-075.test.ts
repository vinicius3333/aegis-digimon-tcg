import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-075.js";
describe("BT9-075 DexDorugamon", () => {
  it("trashes an X Antibody card from hand to gain 1 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-062", as: "base" }], hand: [{ card: "BT9-075", as: "evolving" }, { card: "BT9-078", as: "cost" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT9-075"));
    expect(s.state.players[0]!.hand.some(card => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("grants Blocker and Retaliation when digivolving over Dorugamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-062", as: "base" }],
          hand: [{ card: "BT9-075", as: "evolving" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).hasKeyword(s.perm("base"), "Blocker") &&
        observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"),
    );

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });
});
