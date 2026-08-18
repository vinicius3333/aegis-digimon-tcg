import { effectiveStaticNames, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST12-13.js";

describe("ST12-13 Sistermon Ciel", () => {
  it("is treated as Sistermon Noir and Virus in every zone", () => {
    const definition = getCardDefinition("ST12-13")!;

    expect(effectiveStaticNames(definition)).toEqual(expect.arrayContaining([
      "Sistermon Ciel",
      "Sistermon Noir",
    ]));
    expect(definition.attributes).toContain("Virus");
  });

  it("grants Reboot without immediately unsuspending its targets", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-13", as: "ciel" }, { card: "ST12-04", as: "huckmon", suspended: true }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("huckmon"), "Reboot")).toBe(true);
    expect(s.perm("huckmon").isSuspended).toBe(true);
  });

  it("reveals 3, adds a Huckmon or Royal Knight and trashes the rest", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST12-13", as: "ciel" }], deck: [{ card: "ST12-10", as: "hit" }, "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ciel").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("hit").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
