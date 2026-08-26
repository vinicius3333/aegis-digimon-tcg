import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-035.js";

describe("BT14-035", () => {
  it("preserves Unimon's catalog identity and exact Barrier IR", async () => {
    expect(getCardDefinition("BT14-035")).toMatchObject({
      nameEn: "Unimon", colors: ["Yellow"], level: 4, playCost: 4, dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"], attributes: ["Vaccine"], types: ["Mythical Beast"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [],
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-035", as: "unimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("unimon"), "Barrier")).toBe(true);
  });

  it("legally evolves from yellow level 3 for cost 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-033", as: "base" }], hand: [{ card: "BT14-035", as: "unimon" }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("unimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-035");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT14-033");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
    assertNoLoudGap(s);
  });

  it("pays Barrier during a public battle, trashes top security, and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-035", as: "unimon", suspended: true }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT14-026", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    const unimonId = s.perm("unimon").permanentId;
    expect(s.engine.applyIntent(1, {
      type: "attack", attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: unimonId },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: unimonId, accept: true })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === unimonId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.events).toContainEqual({ kind: "barrierResolved", permanentId: unimonId, accepted: true });
    assertNoLoudGap(s);
  });

  it("allows Barrier to be declined, preserving security while battle deletes Unimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-035", as: "unimon", suspended: true }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT14-026", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    const unimonId = s.perm("unimon").permanentId;
    expect(s.engine.applyIntent(1, {
      type: "attack", attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: unimonId },
    })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: unimonId, accept: false })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== unimonId));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-035");
    assertNoLoudGap(s);
  });
});
