import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-070.js";
import "../index.js";

describe("BT15-070", () => {
  it("reveals four to add a Myotismon-text card and trashes one card if cards were added", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 4,
      rest: "deckBottom",
      add: [{ count: 1 }],
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Trash",
      target: { count: 1, filter: { zone: "hand" } },
      condition: { kind: "ifThisEffectActed" },
    });
  });

  it("naturally reveals and adds a Myotismon-text card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-070", as: "demidevimon" }, { card: "BT1-001", as: "handFiller" }],
          deck: [
            { card: "BT15-098", as: "myotismonText" },
            { card: "BT1-001" },
            { card: "BT1-001" },
            { card: "BT1-001" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("myotismonText").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("myotismonText").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
  it("deletes the opposing battle partner when deleted after losing a battle", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { filter: { sourceRef: "battleOpponent" } } }],
    }));

  it("deletes its battle partner through a legal DemiDevimon-to-Vilemon stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-072", as: "vilemon", under: ["BT15-070"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("vilemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
  });
});
