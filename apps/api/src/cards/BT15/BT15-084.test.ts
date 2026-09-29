import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-084.js";

describe("BT15-084", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-084")).toMatchObject({
      nameEn: "Kari Kamiya",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives an opposing Digimon Security Attack -1 when directly trashed from security", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnDiscardSecurity",
      actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
    });
  });

  it("sets low memory, watches own effect-driven security removal, and plays from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [{ kind: "GainKeyword", cost: { kind: "suspend" } }],
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true });
  });

  it("naturally debuffs an opposing Digimon when Kari is directly trashed from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["BT15-003"] }],
          security: [{ card: "BT15-084", as: "kari" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("kari").instanceId));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("naturally suspends Kari and debuffs an opponent when an own effect removes security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 12000, under: ["BT15-003"] },
            { card: "BT15-084", as: "kari" },
          ],
          security: [{ card: "BT1-009", as: "removed" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kari").isSuspended);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("removed").instanceId)).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});

describe("BT15-084 Kari Kamiya — KB Q&A rulings", () => {
  it("does not activate its security-trash effect when only looked at, but does when an effect trashes it (Q2583)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 12000, under: ["BT15-003"] }],
          hand: [{ card: "BT3-034", as: "looker" }],
          security: [{ card: "BT15-084", as: "kari" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        declinePrompts: ["Add the top security card"],
      },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("looker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT3-034"));
    await drainMicrotasks();

    expect(
      s.decisions.some(({ seat, req }) => seat === 0 && (req.promptText ?? "").includes("Add the top security card")),
    ).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("kari").instanceId]);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("kari").instanceId));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("activates its security-removal watcher when another effect plays it from the security stack (Q6240)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "agumon" }],
          hand: [{ card: "BT13-012", as: "geogreymon" }],
          security: [{ card: "BT15-084", as: "kari" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-084"));
    await drainMicrotasks();

    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("kari").instanceId)).toBe(false);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
