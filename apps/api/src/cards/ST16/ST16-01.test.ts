import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-01.js";

const filler = (count: number) => Array.from({ length: count }, () => "BT1-001");

describe("ST16-01 Tsunomon inherited [When Attacking]", () => {
  it("draws when the host attacks with 6 cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST16-02", as: "host", under: [{ card: "ST16-01" }] }],
        hand: filler(6),
        deck: [{ card: "BT1-002", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    const targetId = s.perm("target").permanentId;
    const drawnId = s.inst("drawn").instanceId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: targetId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.hand).toHaveLength(7);
  });

  it("does not draw when the host attacks with 7 cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST16-02", as: "host", under: [{ card: "ST16-01" }] }],
        hand: filler(7),
        deck: [{ card: "BT1-002", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => false, 100);

    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
