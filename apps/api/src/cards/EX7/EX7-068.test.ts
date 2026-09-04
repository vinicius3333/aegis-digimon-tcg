import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-068.js";
import "../index.js";

describe("EX7-068 Wonder Stomp", () => {
  it("draws 1 and may play a level 3 Puppet Digimon from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1 } },
    ]));
  it("activates its Main effect from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" }));

  it("draws one card and plays a level-3 Puppet from hand through the public Main use", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-068", as: "wonder" },
            { card: "BT11-035", as: "puppet" },
          ],
          battleArea: [{ card: "BT1-045" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wonder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    ).toBe(true);
  });

  it("keeps the Puppet in hand when the optional play is declined after drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-068", as: "wonder" },
            { card: "BT11-035", as: "puppet" },
          ],
          battleArea: [{ card: "BT1-045" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wonder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("puppet").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("puppet").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("draws and plays the Puppet when its Main effect is activated from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX7-068", as: "wonder" }],
          hand: [{ card: "BT11-035", as: "puppet" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("wonder"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    ).toBe(true);
  });
});
