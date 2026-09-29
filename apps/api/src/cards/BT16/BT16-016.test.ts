import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-016.js";
import "../index.js";

describe("BT16-016", () => {
  it("may digivolve into a level 4 Angel/Free from hand for 1 less on your turn or play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, payCost: true, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, payCost: true, optional: true }],
    });
  });
  it("trashes one opposing digivolution card when attacking as inherited", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }],
    }));

  it("naturally digivolves into an Angel from hand when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT16-016", as: "patamon" },
            { card: "BT16-019", as: "angemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("patamon").topCard?.cardId === "BT16-019");

    expect(s.perm("patamon").topCard?.cardId).toBe("BT16-019");
    expect(s.perm("patamon").stack.some((card) => card.cardId === "BT16-016")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("trashes exactly the top digivolution card of an opposing stack on a natural attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-017", as: "host", under: ["BT16-016"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, under: ["BT1-009", "BT1-011"] }] },
      },
      { autoSelectCards: true },
    );

    const topSourceId = s.perm("target").stack.at(-1)!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.some((card) => card.instanceId === topSourceId)).toBe(false);
    expect(s.perm("target").stack).toHaveLength(1);
  });
});

describe("BT16-016 Patamon — KB Q&A rulings", () => {
  const attackWithPipismonOverPatamon = async (targetSources: string[]) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-064", as: "pipismon", under: ["BT16-016"] }] },
        1: { battleArea: [{ card: "BT17-025", as: "target", dp: 9000, suspended: true, under: targetSources }] },
      },
      // Patamon's source trash resolves first, so the target already has no sources when Pipismon's effect would resolve.
      { autoSelectCards: true, autoOrderTriggers: true, preferTriggerKeys: ["BT16-016"] },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pipismon").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    return {
      s,
      targetSurvived: s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId),
    };
  };

  it("trashing the attack target's only digivolution card does not let Pipismon's no-source delete trigger (Q2816)", async () => {
    const withSource = await attackWithPipismonOverPatamon(["BT1-010"]);
    expect(withSource.s.perm("target").stack).toHaveLength(0);
    expect(withSource.s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(withSource.targetSurvived).toBe(true);

    const withoutSource = await attackWithPipismonOverPatamon([]);
    expect(withoutSource.targetSurvived).toBe(false);
  });
});
