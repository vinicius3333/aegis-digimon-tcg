import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-005.js";
import "../index.js";

describe("EX4-005 Agumon", () => {
  it("digivolves from Koromon for the alternate cost of 0 and preserves the source stack", async () => {
    expect(digivolutionRequirementsFor("EX4-005")).toContainEqual({
      names: ["Koromon"],
      cost: 0,
      isAlternate: true,
    });

    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [{ card: "ST1-01", as: "koromon" }],
        hand: [{ card: "EX4-005", as: "agumon" }],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").topCard?.cardId === "EX4-005");

    expect(s.state.memory).toBe(0);
    expect(s.perm("koromon").stack.map(({ cardId }) => cardId)).toContain("ST1-01");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("gains memory at the start of the main phase with a red or yellow Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
      },
    });
  });

  it("draws once per turn when one of your red or yellow Tamers becomes suspended", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    });
  });

  it("gains memory at the start of main phase when a red Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-005", as: "host" },
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

  it("does not gain memory without a red or yellow Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-096", as: "tamer" }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));

    expect(s.state.memory).toBe(0);
  });

  it("draws when a matching Tamer is suspended", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-005"] },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw when a non-red/non-yellow Tamer is suspended", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-005"] },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));
    expect(s.state.players[0]!.deck).toHaveLength(2);

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("draws only once when multiple matching Tamers become suspended in the same turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010", "BT1-011"],
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX4-005"] },
          { card: "BT1-085", as: "firstTamer" },
          { card: "BT1-085", as: "secondTamer" },
        ],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));

    await advance(s.engine).verb.suspend([s.perm("firstTamer").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("firstTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondTamer").permanentId]);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
