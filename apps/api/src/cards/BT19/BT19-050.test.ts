import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-050 Rapidmon", () => {
  it("retains ACE 3/Blast Digivolve hand metadata", () => {
    const card = getCardDefinition("BT19-050");
    expect(card?.isAce).toBe(true);
    expect(card?.overflowMemory).toBe(3);
    expect(runtimeCompiledCard("BT19-050")?.effects[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s independently suspends a Tamer and locks a Digimon",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-050", as: "rapid" }] },
          1: {
            battleArea: [
              { card: "BT19-081", as: "tamer" },
              { card: "BT19-044", as: "digimon" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await advance(s.engine).fireForPermanent(timing, s.perm("rapid"));
      expect(s.perm("tamer").isSuspended).toBe(true);
      expect(s.perm("digimon").isSuspended).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
    },
  );

  it("public green level-4 evolution pays 3 and retains its source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-049", as: "base" }],
          hand: [{ card: "BT19-050", as: "rapid" }],
          deck: ["BT19-030"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rapid").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-050");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-049"]);
    expect(s.state.memory).toBe(2);
  });

  it("inherited +4000 DP exists only on the controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-051", as: "host", under: ["BT19-050"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(11000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("resolves On Play from a public play intent", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-050", as: "rapid" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "digimon" },
            { card: "BT19-081", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapid").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("digimon").isSuspended);
    expect(s.perm("digimon").isSuspended).toBe(true);
  });
});
