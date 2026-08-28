import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-007.js";
import "../index.js";

describe("EX4-007 GeoGreymon", () => {
  it("gains memory at start of main phase with a red or yellow Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
      },
    });
  });
  it("inherits the red/yellow Tamer suspension draw watcher", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("gains memory at the start of main phase with a red Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-007", as: "host" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(s.state.memory).toBe(1);
  });

  it("gains memory at the start of main phase with a yellow Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-007", as: "host" },
          { card: "AD1-019", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    expect(s.state.memory).toBe(1);
  });

  it("draws once when a matching inherited Tamer becomes suspended", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT4-009", as: "host", under: ["EX4-007"] },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    await advance(s.engine).verb.unsuspend([s.perm("tamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when a blue Tamer becomes suspended", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT4-009", as: "host", under: ["EX4-007"] },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
