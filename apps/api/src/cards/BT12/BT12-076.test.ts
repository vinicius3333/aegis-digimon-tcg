import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-076.js";

describe("BT12-076 Dobermon", () => {
  it("digivolves for 2 from a level-3 Save card and rejects a plain near-match", async () => {
    expect(digivolutionRequirementsFor("BT12-076")).toContainEqual({
      level: 3,
      texts: ["Save"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT12-060", as: "saveBase" }],
        hand: [{ card: "BT12-076", as: "dober" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("saveBase").permanentId,
        instanceId: legal.inst("dober").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("saveBase").topCard.cardId === "BT12-076");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-060"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plain" }], hand: [{ card: "BT12-076", as: "dober" }] },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plain").permanentId,
        instanceId: illegal.inst("dober").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("grants Retaliation on a stack built through public evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-076", as: "dober" }],
        hand: [{ card: "BT12-079", as: "jokermon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dober").permanentId,
        instanceId: s.inst("jokermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dober").topCard.cardId === "BT12-079");
    expect(s.perm("dober").stack.map(({ cardId }) => cardId)).toEqual(["BT12-076"]);
    expect(observe(s.engine).hasKeyword(s.perm("dober"), "Retaliation")).toBe(true);
  });

  it("gives its host Retaliation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT12-076"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});
