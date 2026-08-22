import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-009.js";

describe("BT13-009 Huckmon", () => {
  it("may digivolve into BaoHuckmon from hand for free when its controller plays a Sistermon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-009", as: "huckmon" }],
          hand: [{ card: "BT6-082", as: "sistermon" }, { card: "BT13-013", as: "bao" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("huckmon").topCard.cardId === "BT13-013");

    expect(s.state.memory).toBe(7);
    expect(s.perm("huckmon").stack.some((card) => card.cardId === "BT13-009")).toBe(true);
  });

  it("may decline the free BaoHuckmon digivolution", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-009", as: "huckmon" }], hand: [{ card: "BT6-082", as: "sistermon" }, { card: "BT13-013", as: "bao" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.perm("huckmon").topCard.cardId).toBe("BT13-009");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-013")).toBe(true);
  });

  it("gains memory only once per turn from its inherited effect when allied Sistermon are played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-009"] }],
        hand: [{ card: "BT6-082", as: "first" }, { card: "BT6-082", as: "second" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();
    expect(s.state.memory).toBe(5);
  });

  it("does not trigger for a Digimon without Sistermon in its name", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-009"] }], hand: [{ card: "BT1-012", as: "biyomon" }] } });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("biyomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.memory).toBe(7);
  });
});
