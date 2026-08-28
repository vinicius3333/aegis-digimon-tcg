import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-021.js";

describe("BT14-021", () => {
  it("preserves Syakomon's catalog identity and exact Evade IR", () => {
    expect(getCardDefinition("BT14-021")).toMatchObject({
      nameEn: "Syakomon",
      colors: ["Blue"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      attributes: ["Virus"],
      types: ["Crustacean"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }],
    });
  });

  it("evolves legally from a blue level 2 for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT14-002", as: "base" },
        hand: [{ card: "BT14-021", as: "syakomon" }],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("syakomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-021");
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-002"]);
    assertNoLoudGap(s);
  });

  it("accepts Evade, suspends Syakomon, and prevents effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-021", as: "syakomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("syakomon"), "Evade")).toBe(true);

    const deletion = advance(s.engine).verb.deletePermanent([s.perm("syakomon").permanentId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("syakomon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    expect(s.perm("syakomon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("accepts Evade after losing a real Raid battle and survives the battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-021", as: "syakomon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "AD1-004", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("syakomon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadeResolved"));
    expect(s.perm("syakomon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-021")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT14-021");
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("may decline Evade and allow the deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-021", as: "syakomon" }] } });
    await s.ready();
    const permanentId = s.perm("syakomon").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId, accept: false })).toEqual({ ok: true });
    expect(await deletion).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-021");
    assertNoLoudGap(s);
  });

  it("cannot pay Evade while already suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-021", as: "syakomon", suspended: true }] } });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("syakomon").permanentId], "byEffect")).toBe(1);
    expect(s.events.some((event) => event.kind === "evadePrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
