import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-079.js";
import "./BT10-080.js";

describe("BT10-080 SkullBaluchimon", () => {
  it("when effect-trashed from hand, digivolves from trash and gains its temporary On Deletion effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "base" }],
          hand: [
            { card: "BT4-079", as: "discarder" },
            { card: "BT10-080", as: "skull" },
          ],
          deck: [],
        },
        1: { battleArea: [{ card: "BT1-015", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 10;
    const skull = s.inst("skull");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("discarder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.instanceId === skull.instanceId, 120);
    expect(s.perm("base").topCard).toBe(skull);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === skull.instanceId)).toBe(false);
    await settle(() => observe(s.engine).subscriptions("onDeletionOf", s.perm("base").permanentId).length > 0);
    expect(observe(s.engine).subscriptions("onDeletionOf", s.perm("base").permanentId)).toHaveLength(1);
    expect(s.state.memory).toBe(4);

    const sourceId = s.perm("base").permanentId;
    const victimId = s.perm("victim").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not offer the trash evolution when trashed during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "base" }],
          hand: [{ card: "BT10-080", as: "skull" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseTopId = s.perm("base").topCard.instanceId;
    const skullId = s.inst("skull").instanceId;
    s.state.turnSeat = 1;
    await advance(s.engine).verb.trash([skullId], 1);
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === skullId));

    expect(s.perm("base").topCard.instanceId).toBe(baseTopId);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("may decline the trash evolution and leave both the base and trashed card unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "base" }],
          hand: [{ card: "BT10-080", as: "skull" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    const baseTopId = s.perm("base").topCard.instanceId;
    const skullId = s.inst("skull").instanceId;

    await advance(s.engine).verb.trash([skullId], 0);
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === skullId));

    expect(s.perm("base").topCard.instanceId).toBe(baseTopId);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === skullId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does not gain the deletion trigger when digivolving from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-083", as: "base" }],
          hand: [{ card: "BT10-080", as: "skull" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skull").instanceId);
    expect(observe(s.engine).subscriptions("onDeletionOf", s.perm("base").permanentId)).toHaveLength(0);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("victim").permanentId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
