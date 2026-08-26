import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-037.js";

describe("BT14-037", () => {
  it("preserves MagnaAngemon's catalog identity and exact IR", () => {
    expect(getCardDefinition("BT14-037")).toMatchObject({
      nameEn: "MagnaAngemon", colors: ["Yellow"], level: 5, playCost: 4, dp: 8000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"], attributes: ["Vaccine"], types: ["Archangel"], isAce: true, overflowMemory: 3,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        condition: { kind: "zoneCount", value: 5 },
      });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -1000, scaling: { unit: "security", per: 1 },
      });
  });

  it("recovers at five security, then scales exactly one opposing Digimon by six", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-037", as: "magna" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          deck: ["BT1-006"],
        },
        1: { battleArea: [{ card: "BT14-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    const target = () => s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId);
    await settle(() => s.state.players[0]!.security.length === 6 && target()?.currentDP === 1000);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(target()?.currentDP).toBe(1000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("Q2411 skips recovery above five but still applies the full security scaling to one target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-037", as: "magna" }], security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"], deck: ["BT1-007"] },
        1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }, { card: "BT14-029", as: "control", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => [s.perm("target").currentDP, s.perm("control").currentDP].includes(2000));
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-007"]);
    expect([s.perm("target").currentDP, s.perm("control").currentDP].sort((a, b) => a - b)).toEqual([2000, 8000]);
    assertNoLoudGap(s);
  });

  it("legally evolves for cost 3 and applies the post-recovery security count", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-035", as: "base" }], hand: [{ card: "BT14-037", as: "magna" }], security: ["BT1-001"], deck: ["BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 6000);
    expect(s.perm("base").topCard.cardId).toBe("BT14-037");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT14-035");
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("Blast Digivolves for free and pays Overflow 3 when the ACE leaves", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-035", as: "base" }], hand: [{ card: "BT14-037", as: "magna" }], security: ["BT1-001"], deck: ["BT1-002"] },
      1: { battleArea: [{ card: "BT14-020", as: "attacker" }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("magna").instanceId);
    expect(eligible).toBeDefined();
    expect(s.engine.applyIntent(0, { type: "respondCounter", sourceInstanceId: eligible!.instanceId, effectKey: eligible!.effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-037");
    expect(s.state.memory).toBe(0);
    s.state.turnSeat = 0;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });
});
