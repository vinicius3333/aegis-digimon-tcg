import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-097.js";

describe("BT9-097 Metal Storm", () => {
  it("returns an opposing level 6 or lower Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-019"], hand: [{ card: "BT9-097", as: "option" }] }, 1: { battleArea: ["BT9-020"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT9-020"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT9-020")).toBe(true);
  });

  it("does not reduce its cost for a top-card X-Antibody-form name", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-019", as: "host", under: ["BT9-024"] }], hand: [{ card: "BT9-097", as: "option" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(-2);
  });

  it("reduces its cost for the exact X Antibody Option in a Digimon's sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-019", as: "host", under: ["BT9-109"] }], hand: [{ card: "BT9-097", as: "option" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
  });
});
