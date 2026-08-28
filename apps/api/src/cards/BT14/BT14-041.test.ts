import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT14-041.js";

describe("BT14-041", () => {
  it("preserves Seraphimon's catalog identity and separates recovery from its persistent watcher", () => {
    expect(getCardDefinition("BT14-041")).toMatchObject({
      nameEn: "Seraphimon", colors: ["Yellow"], level: 6, playCost: 12, dp: 12000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 4 }],
      forms: ["Mega"], attributes: ["Vaccine"], types: ["Seraph", "Three Great Angels"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Recovery", amount: 1 }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAddSecurity", fireCondition: { kind: "triggerSecurityIsYours" }, actions: [
        { kind: "ModifyDP", amount: -7000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" },
      ] }],
    });
  });

  it("evolves legally, recovers, gives -7000, and gains a second security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "base" }], hand: [{ card: "BT14-041", as: "seraph" }], security: ["BT1-001"], deck: ["BT1-002"] },
      1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }], security: ["BT1-003", "BT1-004", "BT1-005"] },
    }, { autoSelectCards: true });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("seraph").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && s.perm("target").currentDP === 1000);
    await settle();
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("seraph").instanceId);
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).subscriptions("whenAddSecurity", s.perm("base").permanentId)[0]).toMatchObject({
      sourceInstanceId: s.inst("seraph").instanceId,
    });
    expect(s.perm("base").securityAttack).toBe(1);
    assertNoLoudGap(s);
  });

  it("Q2414 reacts to recovery even when T.K. leaves the final security count unchanged", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-041", as: "seraph" }], hand: [{ card: "BT1-087", as: "tk" }], security: [{ card: "BT14-035", as: "yellowChoice" }, "BT1-001"], deck: [{ card: "BT1-002", as: "recovered" }] },
      1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }] },
    }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("yellowChoice").instanceId);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tk").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.state.players[0]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("ignores opponent security additions and resolves only once for two own additions", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-041", as: "seraph" }], deck: ["BT1-001", "BT1-002"] },
      1: { battleArea: [{ card: "BT14-026", as: "target", dp: 15000 }], deck: ["BT1-003"] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
    await settle();
    expect(s.perm("target").currentDP).toBe(15000);
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    await settle(() => s.perm("target").currentDP === 8000);
    await settle();
    expect(observe(s.engine).keywordAmount(s.perm("seraph"), "SecurityAttack")).toBe(1);
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    await settle();
    expect(s.perm("target").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });
});
