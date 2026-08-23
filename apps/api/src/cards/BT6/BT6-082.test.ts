import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-082.js";

describe("BT6-082 Sistermon Blanc", () => {
  it("grants Blocker to Sistermon while Huckmon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-082", as: "blanc" },
          { card: "BT6-009", as: "huckmon" },
          { card: "BT6-084", as: "sistermon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("sistermon"), "Blocker")).toBe(true);
  });

  it("does not offer itself as a blocker without Huckmon or a Royal Knight", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
      },
      1: {
        battleArea: [{ card: "BT6-082", as: "blanc" }],
        security: ["BT1-011"],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("blanc"), "Blocker")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.events.filter((event) => event.kind === "blockWindowOpened")).toEqual([]);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("waits for a real block response while its Huckmon aura is active", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
      },
      1: {
        battleArea: [
          { card: "BT6-082", as: "blanc" },
          { card: "BT6-009", as: "huckmon" },
        ],
        security: ["BT1-011"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened).toMatchObject({ eligibleBlockerIds: [s.perm("blanc").permanentId] });
    expect(observe(s.engine).isAttacking()).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("removes Blocker as soon as the last enabling Digimon leaves play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-082", as: "blanc" },
          { card: "BT6-009", as: "huckmon" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("blanc"), "Blocker")).toBe(true);

    const huckmonId = s.perm("huckmon").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([huckmonId])).toBe(1);

    expect(observe(s.engine).hasKeyword(s.perm("blanc"), "Blocker")).toBe(false);
  });

  it("draws one card on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT6-082", as: "source" }], deck: [{ card: "BT6-083", as: "drawn" }] },
    });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(player.deck).toHaveLength(0);
  });
});
