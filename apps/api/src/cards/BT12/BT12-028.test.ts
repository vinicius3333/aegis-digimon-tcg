import { dnaDigivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-028.js";

describe("BT12-028 Paildramon", () => {
  it("DNA digivolves from blue and green level 4s for 0, trashes up to three top sources from every opponent, and restricts two emptied Digimon", async () => {
    expect(dnaDigivolutionRequirementsFor("BT12-028")).toEqual([
      { cost: 0, materials: [{ color: "Blue", level: 4 }, { color: "Green", level: 4 }] },
    ]);
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-022", as: "blue" },
            { card: "BT12-050", as: "green" },
          ],
          hand: [{ card: "BT12-028", as: "paildramon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT12-025", as: "first", under: ["BT12-019", "BT12-020", "BT12-021"] },
            { card: "BT12-025", as: "second", under: ["BT1-009", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard.cardId === "BT12-028");
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(5);
    expect(observe(s.engine).isRestricted(s.perm("first"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "attack")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not apply the attack restriction after a normal digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-022", as: "base" }],
        hand: [{ card: "BT12-028", as: "paildramon" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT12-025", as: "target" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-028");
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
  });

  it.each([
    ["Imperialdramon name", "BT12-030"],
    ["Free trait", "BT12-028"],
  ])("gains 1 memory at end of attack for an inherited %s host", async (_case, host) => {
    const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT12-028"] }] } });
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });

  it("does not gain inherited memory for an unrelated host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-028"] }] } });
    await advance(s.engine).fire(EffectTiming.EndOfAttack, s.perm("host"));
    expect(s.state.memory).toBe(0);
  });
});
