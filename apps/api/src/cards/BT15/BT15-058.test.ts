import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-058.js";
import "../index.js";

describe("BT15-058", () => {
  it("matches the catalog identity and black/green level-4 evolution routes", () => {
    expect(getCardDefinition("BT15-058")).toMatchObject({
      nameEn: "Ginryumon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      types: ["Beast Dragon", "X Antibody", "DigiPolice"],
    });
  });

  it("retains inherited Blocker", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("binds and suspends one opposing Digimon, then restricts that same target with DigiPolice in stack", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "SelectBind", target: { bindAs: "suspended", filter: { unsuspended: true } } },
        { kind: "Suspend", target: { fromSelectionRef: "suspended" } },
        {
          kind: "Restrict",
          target: { fromSelectionRef: "suspended" },
          restriction: "unsuspend",
          condition: { kind: "selfDigivolutionStackHasTrait" },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "SelectBind" }, { kind: "Suspend" }, { kind: "Restrict" }],
    });
  });
  it("once per turn suspends an opposing Digimon or Tamer when this is suspended", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", target: { filter: { playCostLteTriggerSource: true } } }],
        },
      ],
    }));

  it("naturally suspends and restricts the selected Digimon when DigiPolice is in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-055", as: "base", under: ["BT14-086"] }],
          hand: [{ card: "BT15-058", as: "ginryumon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ginryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-058");

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("naturally fires the inherited ceiling only when its own host suspends", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-063", as: "host", under: ["BT15-058"] }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT15-052", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );

    preferInstanceIds.push(s.perm("low").topCard!.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("low").isSuspended);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
  });
});
