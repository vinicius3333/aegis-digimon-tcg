import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-046.js";

describe("EX8-046", () => {
  it("draws 2 on deletion by trashing a Mineral or Rock card from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 2,
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { count: 1 } },
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));
  it("trashes a Mineral/Rock card and draws two cards when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX8-046", as: "source" },
            { card: "EX8-047", as: "cost" },
          ],
          deck: ["AD1-001", "AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-046"));
    const source = player.battleArea.find((permanent) => permanent.topCard?.cardId === "EX8-046")!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(() => player.hand.filter((card) => card.cardId === "AD1-001").length === 2);
    expect(player.trash.some((card) => card.cardId === "EX8-047")).toBe(true);
    expect(player.hand.filter((card) => card.cardId === "AD1-001")).toHaveLength(2);
  });

  it("does not draw when the hand has no Mineral or Rock card to pay the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-046", as: "source" }], deck: ["AD1-001", "AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-046"));
    const source = player.battleArea.find((permanent) => permanent.topCard?.cardId === "EX8-046")!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(() => player.trash.some((card) => card.cardId === "EX8-046"));
    expect(player.hand.filter((card) => card.cardId === "AD1-001")).toHaveLength(0);
  });

  it("does not trash the optional cost or draw when the deletion effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX8-046", as: "source" },
            { card: "EX8-047", as: "cost" },
          ],
          deck: ["AD1-001", "AD1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-046"));
    const source = player.battleArea.find((permanent) => permanent.topCard?.cardId === "EX8-046")!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(() => player.trash.some((card) => card.cardId === "EX8-046"));

    expect(player.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
    expect(player.deck).toHaveLength(2);
  });

  it("grants Blocker to the live evolution host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-046"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("intercepts a real attack with inherited Blocker on a legal black host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-048", as: "host", under: ["EX8-046"] }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
