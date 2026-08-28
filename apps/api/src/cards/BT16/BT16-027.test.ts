import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-027.js";
import "../index.js";

describe("BT16-027", () => {
  it("matches the catalog identity and alternate Dragon Mode evolution route", () => {
    expect(getCardDefinition("BT16-027")).toMatchObject({
      nameEn: "Imperialdramon: Fighter Mode",
      colors: ["Blue", "Green"],
      level: 6,
      playCost: 8,
      dp: 13000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 5 },
        { color: "Green", level: 5, memoryCost: 5 },
      ],
      types: ["Ancient Dragonkin"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Imperialdramon: Dragon Mode"], cost: 2, isAlternate: true },
    ]);
  });

  it("bottom-decks an opposing Digimon with an equal-or-smaller stack", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        target: expect.objectContaining({ count: 1 }),
      });
    }
  });

  it("unsuspends once per turn and optionally bottom-decks a suspended opponent", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfAttack", frequency: "OncePerTurn" });
    expect(compiled.effects?.[3]?.actions?.[0]).toMatchObject({ kind: "Unsuspend" });
    expect(compiled.effects?.[3]?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      condition: { kind: "selfDigivolutionStackHasTrait" },
    });
  });

  it("bottom-decks an opponent with no more sources than this Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-027", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "within" },
            { card: "BT1-010", as: "above", under: ["BT1-009"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const withinId = s.perm("within").permanentId;
    const aboveId = s.perm("above").permanentId;

    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === withinId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === withinId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
  });

  it("compares source counts after a natural When Digivolving trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-025", as: "base", under: ["BT1-009"] }],
          hand: [{ card: "BT16-027", as: "fighterMode" }],
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "equal", under: ["BT1-009", "BT1-010"] },
            { card: "BT1-010", as: "above", under: ["BT1-009", "BT1-011", "BT1-010"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const equalId = s.perm("equal").permanentId;
    const aboveId = s.perm("above").permanentId;

    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fighterMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === equalId));

    expect(s.perm("base").topCard?.cardId).toBe("BT16-027");
    expect(s.perm("base").stack).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === equalId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
  });

  it("naturally unsuspends once and bottom-decks a suspended opponent when Dragon Mode is stacked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-027", as: "source", under: ["BT16-028"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", suspended: true },
            { card: "BT1-010", as: "secondTarget", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId) &&
        !s.perm("source").isSuspended,
    );

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").isSuspended);

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondTargetId)).toBe(true);
  });
});
