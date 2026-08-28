import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-016.js";
import "../index.js";

describe("BT16-016", () => {
  it("may digivolve into a level 4 Angel/Free from hand for 1 less on your turn or play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }],
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
        0: { hand: [{ card: "BT16-016", as: "patamon" }, { card: "BT16-019", as: "angemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("patamon").topCard?.cardId === "BT16-019");

    expect(s.perm("patamon").topCard?.cardId).toBe("BT16-019");
    expect(s.perm("patamon").stack.some((card) => card.cardId === "BT16-016")).toBe(true);
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
