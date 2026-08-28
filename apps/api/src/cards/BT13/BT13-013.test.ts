import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-013.js";

describe("BT13-013 BaoHuckmon", () => {
  it("after an allied Sistermon play may digivolve into SaviorHuckmon with its cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "savior" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    await settle();

    expect(s.state.memory).toBe(6);
    expect(s.perm("bao").stack.some((card) => card.cardId === "BT13-013")).toBe(true);
  });

  it("does not gain its newly acquired inherited memory effect for the triggering Sistermon (Q2272)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "savior" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    await settle();
    expect(s.state.memory).toBe(6);
  });

  it("may decline the Sistermon-triggered SaviorHuckmon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-013", as: "bao" }],
          hand: [
            { card: "BT6-082", as: "sistermon" },
            { card: "BT13-016", as: "savior" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.perm("bao").topCard.cardId).toBe("BT13-013");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("savior").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("does not reduce a normal digivolution that was not initiated by its Sistermon trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-013", as: "bao" }],
        hand: [{ card: "BT13-016", as: "savior" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("bao").permanentId,
      instanceId: s.inst("savior").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("bao").topCard.cardId === "BT13-016");
    expect(s.state.memory).toBe(7);
  });

  it("its inherited effect gains memory only once per turn for allied Sistermon plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-013"] }],
        hand: [
          { card: "BT6-082", as: "first" },
          { card: "BT6-082", as: "second" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();
    expect(s.state.memory).toBe(5);
  });
});
