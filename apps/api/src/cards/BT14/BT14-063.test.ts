import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-063.js";

describe("BT14-063", () => {
  it("on deletion reveals three to add Monzaemon and play Numemon without cost", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Monzaemon"], match: "name" }] } },
        { to: "play", payCost: false, filter: { nameOrTrait: [{ tokens: ["Numemon"], match: "name" }] } },
      ],
    }));
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));

  it("exposes inherited Blocker on the host Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-042", as: "host", under: ["BT14-063"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("naturally resolves On Deletion by adding Monzaemon, playing Numemon, and bottom-decking the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-063", as: "source" }],
          deck: ["BT1-038", "BT14-058", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-038") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-058"),
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-038");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-058")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT14-063")).toBe(true);
  });

  it("uses inherited Blocker in a natural attack and keeps the player attack off security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-067", as: "host", under: ["BT14-063"] }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker", dp: 4000 }] },
      },
      { autoOrderTriggers: true },
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
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("host").permanentId],
    });

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-015"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId)).toBe(
      true,
    );
  });
});
