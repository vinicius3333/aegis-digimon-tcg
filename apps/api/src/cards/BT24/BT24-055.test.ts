import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_055 } from "./BT24-055.js";
import "../index.js";

describe("BT24-055 Ginryumon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-055")).toMatchObject({
      cardId: "BT24-055",
      nameEn: "Ginryumon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast Dragon", "X Antibody", "DigiPolice", "SEEKERS"],
    });
  });

  it("limits the inherited suspension target to the source's play cost", () => {
    const inherited = BT24_055.effects?.find((entry) => entry.isInherited);
    const action = inherited?.actions?.[0] as unknown as { actions?: unknown[] };
    expect(action).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(action.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLteTriggerSource: true } },
    });
  });
  it("requires Shuu Yulin as the On Play/When Digivolving placement cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_055.effects?.find((entry) => entry.trigger === trigger);
      const action = effect?.actions?.[0] as unknown as { cost: unknown };
      expect(action).toMatchObject({ optional: true, abortOnDecline: true });
      expect(action.cost).toMatchObject({
        kind: "place",
        position: "bottom",
        target: { filter: { nameOrTrait: [{ tokens: ["Shuu Yulin"], match: "nameExact" }] } },
      });
    }
  });

  it("places exact Shuu Yulin under itself and protects a DigiPolice Digimon from opposing De-Digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-054", as: "target" }],
          hand: [
            { card: "BT24-055", as: "ginryumon" },
            { card: "BT15-087", as: "shuu" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ginryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-055"));
    const ginryumon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-055")!;
    await settle(() => ginryumon.stack.some((card) => card.instanceId === s.inst("shuu").instanceId));
    await settle(() => observe(s.engine).hasRestriction(s.perm("target"), "cantBeDeDigivolved", "Digimon"));

    expect(ginryumon.stack[0]!.instanceId).toBe(s.inst("shuu").instanceId);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "cantBeDeDigivolved", "Digimon")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["normal black level-3 requirement", "BT11-036", false, 3],
    ["alternate DigiPolice/SEEKERS requirement", "BT24-054", true, 2],
  ])("uses the %s and resolves When Digivolving", async (_label, baseCard, useAlternateCost, expectedCost) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT24-055", as: "ginryumon" },
            { card: "BT15-087", as: "shuu" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ginryumon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ginryumon").instanceId);
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === s.inst("shuu").instanceId));
    await settle(() => observe(s.engine).hasRestriction(s.perm("base"), "cantBeDeDigivolved", "Digimon"));

    expect(s.state.memory).toBe(5 - expectedCost);
    expect(s.perm("base").stack[0]!.instanceId).toBe(s.inst("shuu").instanceId);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "cantBeDeDigivolved", "Digimon")).toBe(true);
  });

  it("may decline the placement cost and grants no protection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-054", as: "target" }],
          hand: [
            { card: "BT24-055", as: "ginryumon" },
            { card: "BT15-087", as: "shuu" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ginryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ginryumon").topCard.instanceId === s.inst("ginryumon").instanceId);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shuu").instanceId);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "cantBeDeDigivolved", "Digimon")).toBe(false);
  });

  it("does not accept a wrong-name Tamer as the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-055", as: "ginryumon" },
            { card: "BT1-089", as: "wrongTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ginryumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === s.inst("ginryumon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wrongTamer").instanceId);
    expect(s.perm("ginryumon").stack).toHaveLength(0);
  });

  it("inherited effect responds only when its own host suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "host", under: ["BT24-055"] },
            { card: "BT1-009", as: "neighbor" },
          ],
        },
        1: { battleArea: [{ card: "BT1-088", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("neighbor").permanentId]);
    expect(s.perm("target").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("activates the inherited suspension through a public attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-056", as: "host", under: ["BT24-055"] }],
        security: [{ card: "BT1-009", as: "security" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], security: [{ card: "BT1-009" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended && !observe(s.engine).isAttacking());
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not suspend an opposing Digimon above the host play-cost ceiling", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-056", as: "host", under: ["BT24-055"] }] },
      1: { battleArea: [{ card: "BT24-040", as: "highCost" }] },
    });
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    expect(s.perm("highCost").isSuspended).toBe(false);
  });
});
