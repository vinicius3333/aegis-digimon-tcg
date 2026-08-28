import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-032.js";
import "../index.js";

describe("BT16-032", () => {
  it("models Armor Purge and Collision", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Armor Purge" }, { keyword: "Collision" }],
    });
  });

  it("ends an attack when its target is switched", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttackTargetSwitched",
      actions: [{ kind: "RedirectAttack", mode: "endAttack", optional: true }],
    });
  });

  it("ends a natural Collision attack after the target switches", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-032", as: "sheepmon" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sheepmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("attacker").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-032")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
  });

  it("may decline after a target switch so Collision proceeds to battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-032", as: "sheepmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sheepmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("attacker").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("sheepmon").isSuspended).toBe(true);
  });

  it("ends only the first switched attack each turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-032", as: "sheepmon" },
            { card: "BT1-009", as: "secondAttacker" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT5-062", as: "blockerOne" },
            { card: "BT5-062", as: "blockerTwo" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sheepmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blockerOne").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("blockerOne").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 2);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blockerTwo").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT5-062")).toBe(true);
  });

  it("uses Armor Purge to preserve its underlying stack after losing a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-032", as: "sheepmon", under: ["BT1-009"] }] },
      1: { battleArea: [{ card: "BT1-020", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("sheepmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sheepmon").topCard?.cardId === "BT1-009");

    expect(s.perm("sheepmon").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-032")).toBe(true);
  });

  it("evolves from Armadillomon for 2 memory and retains the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-049", as: "armadillomon" }],
        hand: [{ card: "BT16-032", as: "sheepmon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("armadillomon").permanentId,
        instanceId: s.inst("sheepmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("armadillomon").topCard?.cardId === "BT16-032");

    expect(s.perm("armadillomon").stack.map((card) => card.cardId)).toEqual(["BT16-049", "BT16-032"]);
    expect(s.state.memory).toBe(0);
  });

  it("encodes the Armadillomon alternate evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT16-032")).toEqual([
      { names: ["Armadillomon"], cost: 2, isAlternate: true },
    ]);
  });

  it("keeps Armor Purge and Collision active on a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-032", as: "sheepmon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("sheepmon"), "Armor Purge")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("sheepmon"), "Collision")).toBe(true);
  });
});
