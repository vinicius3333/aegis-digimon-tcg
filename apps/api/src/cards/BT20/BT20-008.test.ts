import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-008.js";

describe("BT20-008 Huckmon", () => {
  it("requires the printed trash cost before draw and memory, then buffs all allied Digimon", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(main?.actions[0]).toMatchObject({ kind: "Draw", cost: { kind: "trash" } });
    expect(main?.actions[0]).toMatchObject({ optional: true, abortOnDecline: true });
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(main?.actions[1]?.optional).not.toBe(true);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      target: { count: "all" },
    });
  });

  it("optionally trashes one matching name/trait card, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [
            { card: "BT20-008", as: "nameMatch" },
            { card: "BT20-010", as: "nonMatch" },
            { card: "BT20-045", as: "traitMatch" },
          ],
          deck: [{ card: "BT20-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("huckmon"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("nameMatch").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("traitMatch").instanceId);
    expect(s.state.memory).toBe(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [{ card: "BT20-045", as: "cost" }],
          deck: [{ card: "BT20-011", as: "top" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnStartMainPhase, declined.perm("huckmon"));
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("cost").instanceId);
    expect(declined.state.players[0]!.deck.map((card) => card.instanceId)).toContain(declined.inst("top").instanceId);
    expect(declined.state.memory).toBe(0);
  });

  it("observably buffs every allied Digimon and no opponent only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-012", dp: 4000, as: "host", under: ["BT20-008"] },
          { card: "BT20-010", dp: 1000, as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("ally").currentDP).toBe(2000);
    expect(s.perm("opponent").currentDP).toBe(1000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("ally").currentDP).toBe(1000);
  });
});
