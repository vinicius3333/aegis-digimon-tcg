import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-089.js";

describe("P-089 Amphimon", () => {
  it("scales source trashing from the blue cards actually trashed, then restricts a source-less target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base" }],
          hand: [
            { card: "P-089", as: "amphimon" },
            { card: "BT1-027", as: "blue-a" },
            { card: "BT1-028", as: "blue-b" },
            { card: "BT1-009", as: "red-control" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "stackedTarget",
              under: ["BT1-001", "BT1-002", "BT1-003"],
            },
            { card: "BT1-010", as: "sourceLessTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blueIds = [s.inst("blue-a").instanceId, s.inst("blue-b").instanceId];
    const redId = s.inst("red-control").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("amphimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      blueIds.every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id)) &&
      s.perm("stackedTarget").stack.length === 1 &&
      observe(s.engine).isRestricted(s.perm("sourceLessTarget"), "beSuspended")
    );

    expect(blueIds.every(
      (id) => s.state.players[0]!.trash.some((card) => card.instanceId === id),
    )).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === redId)).toBe(true);
    expect(s.perm("stackedTarget").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("sourceLessTarget"), "beSuspended")).toBe(true);
  });

  it("Q4181: returns exactly 3 Jellymon-text cards to end an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-089", as: "amphimon" }],
          trash: [
            { card: "P-061", as: "jellymon" },
            { card: "BT9-021", as: "jellymon-bt9" },
            { card: "BT9-025", as: "teslaJellymon" },
          ],
          security: [{ card: "BT1-001", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const returnedIds = ["jellymon", "jellymon-bt9", "teslaJellymon"].map(
      (alias) => s.inst(alias).instanceId,
    );
    const securityId = s.inst("security").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => returnedIds.every(
      (id) => s.state.players[0]!.deck.some((card) => card.instanceId === id),
    ));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.decisions.filter(({ req }) =>
      req.kind === "optional" && req.sourceCardId === "P-089"
    )).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
