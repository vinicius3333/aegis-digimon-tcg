import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-070.js";
import "../index.js";

describe("EX7-070 Der Blitz", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-070")).toMatchObject({
      cardId: "EX7-070",
      nameEn: "Der Blitz",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 6,
      types: ["Three Musketeers"],
      securityEffectText: "[Security] Delete 1 of your opponent's Digimon with the lowest play cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-070")).toBe(true);
  });
  it("De-Digivolves an opponent when this stack card is trashed", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDigivolutionCardDiscarded",
      sourceFilter: { isSelfRef: true },
      requireByEffect: true,
      actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }],
    }));
  it("deletes the lowest-cost opponent and places itself under a Three Musketeers Digimon", () =>
    expect(compiled.effects?.find((e) => e.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { superlative: "lowestPlayCost" } } },
      { kind: "PlaceUnder", position: "bottom" },
    ]));
  it("deletes the lowest-cost opponent from security", () =>
    expect(compiled.effects?.find((e) => e.isSecurity)?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    }));

  it("deletes the lowest-cost opponent and places itself under a Three Musketeers Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-070", as: "blitz" }],
          battleArea: [{ card: "EX7-048", as: "musketeer" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap" },
            { card: "EX7-046", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("cheap").instanceId));
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("cheap").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(
      s.inst("expensive").instanceId,
    );
    expect(s.perm("musketeer").stack.map((card) => card.instanceId)).toContain(s.inst("blitz").instanceId);
  });

  it("de-digivolves an opponent when EX7-059 publicly trashes this stack card as its attack cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-059", as: "host", under: [{ card: "EX7-070", as: "blitz" }] }],
          hand: [{ card: "EX7-066", as: "used" }],
        },
        1: {
          battleArea: [{ card: "EX7-046", as: "target", dp: 16000, under: ["BT1-009"] }],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("target").instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-009" && !observe(s.engine).isAttacking());
    expect(s.perm("target").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("blitz").instanceId);
  });

  it("rejects the black Option without a black source or Three Musketeers color waiver", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX7-070", as: "blitz" }], battleArea: [{ card: "BT1-009", as: "ordinary" }] },
      1: { battleArea: [{ card: "BT1-009", as: "cheap" }] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blitz").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("blitz").instanceId);
  });

  it("deletes one lowest-play-cost opponent during a real Security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "EX7-070", as: "blitz" }, "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker" },
            { card: "BT1-009", as: "cheap" },
            { card: "EX7-046", as: "expensive" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cheap").instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("cheap").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("expensive"), "attack")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
