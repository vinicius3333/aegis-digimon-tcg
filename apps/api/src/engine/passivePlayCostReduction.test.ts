import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/EX2/EX2-057.js";

describe("GameEngine passive would-be-played cost reductions", () => {
  it("applies a matching passive reducer once and leaves a nonmatching play unchanged", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-018", as: "marine" }] },
    });
    matching.state.memory = 10;
    await matching.ready();
    expect(
      matching.engine.applyIntent(0, { type: "playCard", instanceId: matching.inst("marine").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      matching.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === matching.inst("marine").instanceId),
    );
    expect(matching.state.memory).toBe(0);

    const nonmatching = setupEngine({
      0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-014", as: "blue" }] },
    });
    nonmatching.state.memory = 10;
    await nonmatching.ready();
    expect(
      nonmatching.engine.applyIntent(0, { type: "playCard", instanceId: nonmatching.inst("blue").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      nonmatching.state.players[0]!.battleArea.some(
        (p) => p.topCard?.instanceId === nonmatching.inst("blue").instanceId,
      ),
    );
    expect(nonmatching.state.memory).toBe(6);
  });

  it("stacks independent passive watchers and respects a play cost-reduction block", async () => {
    const stacked = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-057", as: "first" },
          { card: "EX2-057", as: "second" },
        ],
        hand: [{ card: "EX2-018", as: "marine" }],
      },
    });
    stacked.state.memory = 10;
    await stacked.ready();
    expect(stacked.engine.applyIntent(0, { type: "playCard", instanceId: stacked.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      stacked.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === stacked.inst("marine").instanceId),
    );
    expect(stacked.state.memory).toBe(1);

    const blocked = setupEngine({
      0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-018", as: "marine" }] },
    });
    blocked.state.memory = 20;
    await blocked.ready();
    advance(blocked.engine).ledgers.continuous.addCostReductionBlock(0, "play", EffectDuration.Permanent);
    expect(blocked.engine.applyIntent(0, { type: "playCard", instanceId: blocked.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      blocked.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === blocked.inst("marine").instanceId),
    );
    expect(blocked.state.memory).toBe(9);
  });

  it("does not double-count a passive reducer with an interactive reducer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-057", as: "kenta" }], hand: [{ card: "EX2-018", as: "marine" }] },
    });
    s.state.memory = 10;
    await s.ready();
    advance(s.engine).ledgers.subTriggers.subscribeReplacement({
      event: "wouldBePlayed",
      sourcePermanentId: s.perm("kenta").permanentId,
      controllerSeat: 0,
      mode: "reduceCost",
      amount: 1,
      appliesTo: () => true,
      activate: async () => 1,
      description: "synthetic interactive reduction",
    });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("marine").instanceId),
    );
    expect(s.state.memory).toBe(1);
  });
});
