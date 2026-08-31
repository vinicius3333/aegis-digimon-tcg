import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-036.js";
import "../index.js";

describe("BT16-036", () => {
  it("models Barrier, Blocker, Partition, and the Boss/D-Brigade traits", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      keywords: [{ keyword: "Barrier" }, { keyword: "Blocker" }, { keyword: "Partition" }],
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Boss", "D-Brigade"] }],
    });
  });

  it("DNA digivolves for free and applies its When Digivolving effects", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "DnaDigivolve", payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(compiled.effects?.[2]?.actions?.[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -8000,
      duration: "forTheTurn",
    });
  });

  it("encodes the exact Yellow Lv.6 plus Black Lv.6 DNA requirement", () => {
    const requirement = [{ cost: 0, materials: [{ color: "Yellow", level: 6 }, { color: "Black", level: 6 }] }];

    expect(compiled.dnaDigivolveRequirement).toEqual(requirement);
    expect(dnaDigivolutionRequirementsFor("BT16-036")).toEqual(requirement);
  });

  it("trashes the top card of both security stacks at opponent-turn end", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Trash" }, { kind: "Trash" }],
    });
  });

  it("trashes your security card even when the opponent has no security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-036", as: "chaosmon" }], security: ["BT1-009"] },
      1: { security: [] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("chaosmon"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("naturally trashes both security tops at the opponent's turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-036", as: "chaosmon" }], security: ["BT1-009"], deck: ["BT1-009"] },
      1: { security: ["BT1-009"], deck: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("naturally DNA digivolves from the specified colors and applies De-Digivolve plus -8000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-013", as: "yellowMaterial" },
            { card: "BT16-065", as: "blackMaterial" },
          ],
          hand: [{ card: "BT16-036", as: "chaosmon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT16-036", as: "target", under: ["BT16-065"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("blackMaterial").permanentId],
        instanceId: s.inst("chaosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-036"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-036");
    expect(result?.isSuspended).toBe(false);
    expect(s.perm("target").topCard?.cardId).toBe("BT16-065");
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("rejects a natural DNA attempt whose materials are both black level 6", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-065", as: "blackA" },
          { card: "BT16-065", as: "blackB" },
        ],
        hand: [{ card: "BT16-036", as: "chaosmon" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blackA").permanentId, s.perm("blackB").permanentId],
        instanceId: s.inst("chaosmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-036")).toBe(true);
  });

  it("naturally uses Blocker to stop an attack on its player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-036", as: "chaosmon" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("chaosmon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("chaosmon").isSuspended).toBe(true);
  });

  it("naturally partitions its Yellow and Black level-6 cards after opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-013", as: "yellowMaterial" },
            { card: "BT16-065", as: "blackMaterial" },
          ],
          hand: [{ card: "BT16-036", as: "chaosmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT17-018", as: "redSource" }],
          hand: [{ card: "ST1-16", as: "gaia" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("blackMaterial").permanentId],
        instanceId: s.inst("chaosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-036"));

    const chaosmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-036");
    expect(chaosmon).toBeDefined();
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-036") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-013") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-065"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-036")).toBe(false);
    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-013")?.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT16-065")?.stack).toHaveLength(0);
  });

  it("keeps Barrier, Blocker, Partition, Boss, and D-Brigade active live", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-036", as: "chaosmon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("chaosmon"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chaosmon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chaosmon"), "Partition")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("chaosmon"), "Boss")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("chaosmon"), "D-Brigade")).toBe(true);
  });
});
