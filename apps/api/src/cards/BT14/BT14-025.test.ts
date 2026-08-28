import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-025.js";

describe("BT14-025", () => {
  it("preserves Shellmon's catalog identity and exact Evade IR", () => {
    expect(getCardDefinition("BT14-025")).toMatchObject({
      nameEn: "Shellmon",
      colors: ["Blue"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      attributes: ["Data"],
      types: ["Mollusk"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Static", actions: [], keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] }],
    });
  });

  it("evolves legally from Syakomon for cost 2 and exposes Evade", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-021", as: "base" }], hand: [{ card: "BT14-025", as: "shellmon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shellmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-025");
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-021"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Evade")).toBe(true);
    assertNoLoudGap(s);
  });

  it("accepts Evade to suspend and prevent effect deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-025", as: "shellmon" }] } });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("shellmon").permanentId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondEvade",
        permanentId: s.perm("shellmon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    expect(s.perm("shellmon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("accepts Evade after losing a real Raid battle and survives", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-025", as: "shellmon" }], security: ["BT1-001"] },
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
        permanentId: s.perm("shellmon").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "evadeResolved"));
    expect(s.perm("shellmon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT14-025");
    expect(s.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("allows deletion when Evade is declined and offers none while already suspended", async () => {
    const declined = setupEngine({ 0: { battleArea: [{ card: "BT14-025", as: "shellmon" }] } });
    await declined.ready();
    const permanentId = declined.perm("shellmon").permanentId;
    const deletion = advance(declined.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => declined.events.some((event) => event.kind === "evadePrompt"));
    expect(declined.engine.applyIntent(0, { type: "respondEvade", permanentId, accept: false })).toEqual({ ok: true });
    expect(await deletion).toBe(1);

    const suspended = setupEngine({
      0: { battleArea: [{ card: "BT14-025", as: "shellmon", suspended: true }] },
    });
    await suspended.ready();
    expect(
      await advance(suspended.engine).verb.deletePermanent([suspended.perm("shellmon").permanentId], "byEffect"),
    ).toBe(1);
    expect(suspended.events.some((event) => event.kind === "evadePrompt")).toBe(false);
    assertNoLoudGap(declined);
    assertNoLoudGap(suspended);
  });
});
