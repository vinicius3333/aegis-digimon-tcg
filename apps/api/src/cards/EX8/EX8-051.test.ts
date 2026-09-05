import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-051.js";

describe("EX8-051", () => {
  function primitivesOf(s: EngineSetup): Primitives {
    return (s.engine as unknown as { primitives: Primitives }).primitives;
  }

  it("inherits De-Digivolve 1 when trashed from a Mineral/Rock host", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          actions: [{ kind: "DeDigivolve", amount: 1 }],
        },
      ],
    }));
  it("has Collision, Piercing, and Fragment (3)", () =>
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
      ]),
    ));
  it("exposes all three keywords on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-051", as: "proganomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("proganomon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("proganomon"))).toBe(true);
  });
  it("prevents deletion by trashing exactly three digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-051", as: "proganomon", under: ["EX8-050", "EX8-049", "EX8-048"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.players[0]!.battleArea[0]!.isSuspended = true;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("proganomon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("proganomon").stack.length === 0);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("proganomon").permanentId)).toBe(true);
    expect(s.perm("proganomon").stack).toHaveLength(0);
    expect(
      s.state.players[0]!.trash.filter((card) => ["EX8-050", "EX8-049", "EX8-048"].includes(card.cardId)),
    ).toHaveLength(3);
  });

  it("de-digivolves an opposing Digimon when trashed from a qualifying host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-053", as: "host", under: [{ card: "EX8-051", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009", "BT1-010"] }] },
    });
    await s.ready();
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("does not de-digivolve when trashed from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", as: "host", under: [{ card: "EX8-051", as: "discarded" }] }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", under: ["BT1-009", "BT1-010"] }] },
    });
    await s.ready();
    await primitivesOf(s).trashDigivolutionCards(s.perm("host").permanentId, [s.inst("discarded").instanceId], {
      byEffectSeat: 0,
    });
    expect(s.perm("target").stack).toHaveLength(2);
  });

  it("uses Collision to grant Blocker and force an opponent's block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-051", as: "proganomon", dp: 20000 }] },
      1: {
        battleArea: [{ card: "BT1-016", as: "blocker", dp: 1000 }],
        security: ["BT1-001"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("proganomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : []).toContain(
      s.perm("blocker").permanentId,
    );
    expect(opened && "mustBlock" in opened ? opened.mustBlock : false).toBe(true);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({
      ok: true,
    });
  });
});
