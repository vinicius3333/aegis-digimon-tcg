import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST1/ST1-13.js";
import "../ST1/ST1-14.js";
import "./BT10-032.js";

describe("BT10-032 Renamon", () => {
  it("adds a Plug-In Option and yellow Tamer from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-032", as: "source" }],
          deck: [{ card: "BT10-105", as: "plugin" }, { card: "BT10-089", as: "tamer" }, "BT10-029", "BT10-030"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("plugin").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });

  it("gives one opposing Digimon -2000 DP after a cost 2 Option is used, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }],
          hand: [
            { card: "ST1-14", as: "firstOption" },
            { card: "ST1-14", as: "secondOption" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("secondOption").instanceId));
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("does not trigger for an Option with a use cost below 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }],
          hand: [{ card: "ST1-13", as: "cheapOption" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("cheapOption").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cheapOption").instanceId));

    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("uses the Option's original use cost even when an effect pays no memory (Q5450)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-032"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "option-used-without-paying",
    });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });
});
