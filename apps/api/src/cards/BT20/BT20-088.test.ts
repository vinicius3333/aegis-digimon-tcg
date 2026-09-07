import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-088.js";
import "./index.js";

describe("BT20-088 Violet Inboots", () => {
  it("gains memory only when the opponent has a Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("gates the reduced Ghost digivolution on suspending this Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" } },
              into: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
              payCost: true,
              reduceCost: 2,
              cost: { kind: "suspend", target: { isSelf: true } },
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });

  it.each([true, false])("naturally evolves a Digimon after an own Ghost is deleted (accept=%s)", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-088", as: "tamer" },
            { card: "BT20-063", as: "deletedGhost", dp: 1000 },
            { card: "BT20-067", as: "recipient", dp: 5000 },
          ],
          hand: [{ card: "BT20-072", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT20-079", as: "blocker", dp: 12000, suspended: true }] },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deletedGhost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("tamer").isSuspended).toBe(accept);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-063")).toBe(true);
    expect(s.state.memory).toBe(accept ? 1 : 2);
    expect(s.perm("recipient").topCard.cardId).toBe(accept ? "BT20-072" : "BT20-067");
  });

  it("does not offer the Ghost evolution when an own non-Ghost Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-088", as: "tamer" },
            { card: "BT10-071", as: "deletedNonGhost", dp: 1000 },
            { card: "BT20-067", as: "recipient", dp: 5000 },
          ],
          hand: [{ card: "BT20-072", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT20-079", as: "blocker", dp: 12000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deletedNonGhost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.trash.some((card) => card.cardId === "BT10-071"),
    );
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("recipient").topCard.cardId).toBe("BT20-067");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-072");
  });
});

it("plays the exact BT20-088 security instance for free after a public check", async () => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "BT1-010", as: "attacker" }] }, 1: { security: [{ card: "BT20-088", as: "tamer" }] } },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  const tamerId = s.inst("tamer").instanceId;
  s.state.memory = 3;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((e) => e.kind === "securityChecked"));
  expect(s.events.some((e) => e.kind === "securityChecked")).toBe(true);
  expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toContain(tamerId);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.state.memory).toBe(3);
});
