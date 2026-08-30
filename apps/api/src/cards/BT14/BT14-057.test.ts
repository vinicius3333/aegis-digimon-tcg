import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-057.js";

describe("BT14-057", () => {
  it("has Save and places itself under an own Tamer on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      keywords: [{ keyword: "Save" }],
      actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Tamer"] } }],
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));

  it("uses inherited Blocker in a natural attack block", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 1000 }], security: ["AD1-001"] },
      1: { battleArea: [{ card: "BT14-058", as: "host", dp: 2000, under: ["BT14-057"] }] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    const hostId = s.perm("host").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("naturally saves itself under an own Tamer after battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-086", as: "tamer" },
            { card: "BT14-057", as: "chuu", dp: 2000, suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("chuu").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.cardId === "BT14-057"));
    expect(s.perm("tamer").stack.some((card) => card.cardId === "BT14-057")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-057")).toBe(false);
  });
});
