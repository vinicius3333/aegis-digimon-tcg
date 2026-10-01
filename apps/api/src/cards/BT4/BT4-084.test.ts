import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-041.js";
import "./BT4-084.js";

describe("BT4-084 NeoDevimon", () => {
  it("gains 3 memory when the opponent plays a Tamer on their turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-084", as: "neo", under: ["BT4-081"] }] },
        1: { hand: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-085") && s.state.memory === 3,
    );

    expect(s.state.memory).toBe(3);
  });

  it("its inherited effect gains 1 memory when an opposing Tamer becomes suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-087", as: "host", under: ["BT4-084"] }] },
      1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.state.memory === -1);
    expect(s.state.memory).toBe(-1);
  });

  it("gains only 1 memory when multiple opposing Tamers suspend together", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-087", as: "host", under: ["BT4-084"] }] },
      1: {
        battleArea: [
          { card: "BT1-085", as: "first" },
          { card: "BT1-085", as: "second" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("first").permanentId, s.perm("second").permanentId]);
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});

describe("BT4-084 NeoDevimon — KB Q&A rulings", () => {
  it("gains only 1 memory when [ShineGreymon] suspends 2 opposing Tamers at once (Q1230)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-087", as: "host", under: ["BT4-084"] }] },
        1: {
          battleArea: [
            { card: "BT1-057", as: "base" },
            { card: "BT19-083", as: "firstTamer" },
            { card: "BT19-083", as: "secondTamer" },
          ],
          hand: [{ card: "BT2-041", as: "shine" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 2000);
    await drainMicrotasks();

    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("secondTamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(10 - 4 - 1);
  });
});
