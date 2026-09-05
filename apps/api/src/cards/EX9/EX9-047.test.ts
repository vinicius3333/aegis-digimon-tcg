import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-047.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-047", () => {
  it("Collision forces a non-Blocker to block without allowing direct attacks on unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-047", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender" }], security: ["BT1-001"] },
    });
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;
    const blockerPermanentId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "permanent", permanentId: blockerPermanentId },
      }).ok,
    ).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId, target: { kind: "player" } })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      mustBlock: true,
      eligibleBlockerIds: [blockerPermanentId],
    });
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Rush and Collision and returns a Negamon-text Digimon from trash on deletion", () => {
    expect(compiled.effects?.flatMap((entry) => entry.keywords)).toEqual(
      expect.arrayContaining([
        { keyword: "Rush", raw: "＜Rush＞" },
        { keyword: "Collision", raw: "＜Collision＞" },
      ]),
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } },
        },
      ],
    });
  });
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));
  it("returns a Negamon-text Digimon from trash to hand on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-047", as: "source" }], trash: ["EX9-054"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => player.hand.some((card) => card.cardId === "EX9-054"));
    expect(player.hand.some((card) => card.cardId === "EX9-054")).toBe(true);
  });

  it("can attack the turn it is played through Rush", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-047", as: "rush" }] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rush").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("rush").topCard.cardId === "EX9-047");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rush").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("may decline the deletion rescue, leaving the target in trash", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-047", as: "source" }], trash: ["EX9-054"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-054")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-054")).toBe(true);
  });

  it("applies inherited +1000 DP through a legal black level-4-to-5 stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-063", as: "host", under: ["EX9-047"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
  });
});
