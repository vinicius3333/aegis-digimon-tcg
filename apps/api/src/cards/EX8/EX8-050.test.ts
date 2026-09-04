import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-050.js";

describe("EX8-050", () => {
  it("has Blocker and reveals 3 to play a Mineral or Rock Digimon costing 5 or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1, to: "play", optional: true }],
      rest: "trash",
    });
  });
  it("reveals three cards on deletion, plays a matching Digimon, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-050", as: "source" }],
          deck: [
            { card: "EX8-049", as: "match" },
            { card: "EX8-048", as: "other" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const source = player.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-049")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-048")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
  });

  it("trashes all three revealed cards when no Mineral or Rock card is within the cost limit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-050", as: "source" }],
          deck: [
            { card: "EX8-053", as: "overCost" },
            { card: "EX8-052", as: "other" },
            { card: "BT1-010", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const source = player.battleArea[0]!;
    await advance(s.engine).verb.deletePermanent([source.permanentId]);
    await settle(
      () => player.trash.filter((card) => ["EX8-053", "EX8-052", "BT1-010"].includes(card.cardId)).length === 3,
    );

    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.some((card) => card.instanceId === s.inst("overCost").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
    expect(player.trash.some((card) => card.instanceId === s.inst("rest").instanceId)).toBe(true);
  });

  it("redirects an opponent's attack to the inherited host once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-081", as: "host", under: ["EX8-050"], dp: 10000 }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker", dp: 1000 },
            { card: "BT1-016", as: "second", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("exposes its printed Blocker keyword live", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-050", as: "gogmamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gogmamon"), "Blocker")).toBe(true);
  });
});
