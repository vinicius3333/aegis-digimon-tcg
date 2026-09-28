import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-09.js";
import "./ST1-06.js";
import "../BT1/BT1-021.js";
import "../BT1/BT1-084.js";
import "../BT1/BT1-114.js";

describe("ST1-09 MetalGreymon", () => {
  it("registers the inherited blocked trigger as complete IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "WhenBlocked", isInherited: true, actions: [{ kind: "GainMemory", amount: 3 }] }],
    });
  });

  it("gains 3 memory when its host is blocked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "attacker", under: ["ST1-09"] }] },
        1: {
          battleArea: [{ card: "ST1-06", as: "blocker" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory when attacking an opponent's Digimon directly without a block (Q604)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-10", as: "attacker", under: ["ST1-09"] }] },
      1: { battleArea: [{ card: "ST1-06", as: "defender", suspended: true }] },
    });
    s.state.memory = 0;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId));

    expect(s.state.memory).toBe(0);
  });
});

describe("ST1-09 MetalGreymon — KB Q&A rulings", () => {
  it("choosing ST1-09 with Omnimon deletes every opposing [MetalGreymon] regardless of card number (Q942)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "ST1-09", as: "chosen" },
            { card: "BT1-021", as: "otherPrintA" },
            { card: "BT1-114", as: "otherPrintB" },
            { card: "BT1-011", as: "differentName" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 6;
    const metalGreymonInstanceIds = ["chosen", "otherPrintA", "otherPrintB"].map(
      (alias) => s.perm(alias).topCard.instanceId,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("differentName").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(metalGreymonInstanceIds),
    );
  });
});
