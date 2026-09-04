import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX7-073.js";

describe("EX7-073", () => {
  it("may use a Three Musketeers Option from hand without cost when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
    }));
  it("may trash 2 Three Musketeers digivolution cards to delete the opponent's highest-level Digimon and trash the top security when digivolving or attacking", () => {
    const digivolving = compiled.effects?.filter((entry) => entry.trigger === "WhenDigivolving")[1]?.actions ?? [];
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions ?? [];
    expect(digivolving[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "highestLevel" } },
      cost: { kind: "trash", target: { count: 2, filter: { isSelfRef: true, zone: "digivolutionCards" } } },
    });
    expect(digivolving[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trash",
      controller: "opponent",
      amount: 1,
      toTop: true,
      condition: { kind: "ifThisEffectActed" },
    });
    expect(attacking).toHaveLength(2);
    expect(attacking[0]).toMatchObject({
      kind: "Delete",
      cost: { kind: "trash", target: { count: 2, filter: { isSelfRef: true, zone: "digivolutionCards" } } },
    });
  });

  it("publicly resolves the digivolving branch with two Three Musketeers sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-059", as: "host", under: ["EX7-071", "EX7-066"] }],
          hand: [{ card: "EX7-073", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "EX7-060", as: "highest" },
            { card: "BT1-009", as: "lower" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("host").topCard?.cardId).toBe("EX7-073");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX7-071", "EX7-066"]),
    );
  });

  it("publicly resolves the attacking branch with two Three Musketeers sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-073", as: "attacker", under: ["EX7-071", "EX7-066"] }] },
        1: { battleArea: [{ card: "EX7-060", as: "highest" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses a matching Option for free after a legal one-memory evolution, leaving a nonmatching Option in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-059", as: "host" }],
          hand: [{ card: "EX7-073", as: "evolution" }, "EX7-066", "EX7-068"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.state.pendingDecision);
    expect(s.perm("host").topCard?.cardId).toBe("EX7-073");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX7-068"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(9);
  });

  it.each([
    { refuse: false, label: "cannot pay with one matching source and one nonmatching source" },
    { refuse: true, label: "does not delete or trash security when the cost is refused before battle" },
  ])("$label", async ({ refuse }) => {
    const sources = refuse ? ["EX7-071", "EX7-066"] : ["EX7-071", "BT1-009"];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-073", as: "attacker", under: sources }] },
        1: {
          battleArea: [{ card: "BT10-022", as: "defender", dp: 15000, suspended: true }],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: !refuse, autoDeclineOptional: refuse, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX7-073", ...sources]),
    );
  });
});
