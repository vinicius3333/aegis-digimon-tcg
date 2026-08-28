import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-029.js";

describe("BT14-029", () => {
  it("preserves Plesiomon's catalog identity and corrected IR", () => {
    expect(getCardDefinition("BT14-029")).toMatchObject({
      nameEn: "Plesiomon",
      colors: ["Blue"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
      attributes: ["Data"],
      types: ["Plesiosaur"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 3,
      scope: "acrossDigimon",
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          condition: {
            kind: "opponentHasNone",
            filter: { controllerDefault: "opponent", digivolutionCardsCompareToSource: "gte" },
            raw: "your opponent has no Digimon with as many or more digivolution cards as this Digimon",
          },
        },
      ],
    });
  });

  it("Q2398 trashes 2 sources from one Digimon and 1 from another on legal evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-028", as: "base" }], hand: [{ card: "BT14-029", as: "plesio" }] },
        1: {
          battleArea: [
            { card: "BT14-015", as: "first", under: ["BT14-007", "BT14-012"] },
            { card: "BT14-016", as: "second", under: ["BT14-012"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("plesio").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 3);
    expect(s.perm("base").topCard.cardId).toBe("BT14-029");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-028"]);
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("Q2399 unsuspends with no opposing Digimon, but only once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-029", as: "plesio", under: ["BT14-028"] }] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesio").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.perm("plesio").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesio").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("plesio").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("the errata does not unsuspend when an opponent has an equal source count", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-029", as: "plesio", under: ["BT14-028"] }] },
      1: {
        battleArea: [{ card: "BT14-016", as: "equal", under: ["BT14-012"] }],
        security: ["BT1-001"],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesio").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("plesio").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
