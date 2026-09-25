import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-068.js";

describe("EX6-068 Descent of the Three Great Angels", () => {
  it("contains security placement, Delay search, and Security permanent IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("placeAsSecurity");
    expect(text).toContain("Three Great Angels");
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(text).toContain("onDeletionOf");
  });
  it("publicly places an Angel at security bottom before placing the Option in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-055", as: "source" }],
          hand: [
            { card: "EX6-068", as: "option" },
            { card: "BT1-053", as: "angel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068")).toBe(true);
  });
  it("publicly still places itself when the optional security placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-055", as: "source" }],
          hand: [
            { card: "EX6-068", as: "option" },
            { card: "BT1-053", as: "angel" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("angel").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068")).toBe(true);
  });

  it("places itself in its owner's battle area after a public attack reveals it from security", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "EX6-068", as: "option" },
          { card: "BT1-009", as: "nextSecurity" },
        ],
        deck: Array.from({ length: 5 }, () => "BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        security: ["BT1-009", "BT1-009"],
        deck: Array.from({ length: 5 }, () => "BT1-009"),
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const nextSecurityId = s.inst("nextSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([nextSecurityId]);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([optionId]);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("arms Delay on a deleted Angel and plays a Three Great Angels card from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-053", as: "angel" }],
          hand: [{ card: "EX6-068", as: "option" }],
          security: [{ card: "BT1-063", as: "seraph" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).verb.deletePermanent([s.perm("angel").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-063"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-063")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("does not arm Delay when a non-Angel Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-053", as: "provider" },
            { card: "BT1-045", as: "victim" },
          ],
          hand: [{ card: "EX6-068", as: "option" }],
          security: [{ card: "BT1-063", as: "seraph" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068"));
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-063")).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("seraph").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-068")).toBe(true);
  });
});
