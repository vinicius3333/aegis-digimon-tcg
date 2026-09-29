import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-082.js";

describe("BT7-082 Sistermon Blanc (Awakened)", () => {
  it("limits the recovery cost source to Sistermon Blanc in hand or trash", () => {
    expect(runtimeCompiledCard("BT7-082")?.effects[0]?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      optional: true,
      cost: {
        kind: "place",
        target: {
          from: ["hand", "trash"],
          filter: { nameOrTrait: [{ tokens: ["Sistermon Blanc"], match: "nameExact" }] },
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
  });

  it("places Sistermon Blanc under itself to recover one card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-082", as: "source" },
            { card: "BT6-082", as: "material" },
          ],
          deck: [{ card: "BT7-084", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.security.some((c) => c.instanceId === s.inst("recovery").instanceId));
    const source = player.battleArea.find((p) => p.topCard?.cardId === "BT7-082");
    expect(source?.stack.some((c) => c.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});

describe("BT7-082 Sistermon Blanc (Awakened) — KB Q&A rulings", () => {
  const offeredCandidates = (s: ReturnType<typeof setupEngine>, sourceCardId: string) =>
    s.decisions
      .filter(({ req }) => req.sourceCardId === sourceCardId)
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);

  it("cannot place a [Sistermon Blanc (Awakened)] from hand or trash for the [On Play] cost (Q1646)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-082", as: "source" },
            { card: "BT7-082", as: "awakenedInHand" },
            { card: "BT6-082", as: "plainBlanc" },
          ],
          trash: [{ card: "EX13-065", as: "awakenedInTrash" }],
          deck: [{ card: "BT7-084", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const player = s.state.players[0] as PlayerState;
    const awakenedIds = [s.inst("awakenedInHand").instanceId, s.inst("awakenedInTrash").instanceId];
    preferInstanceIds.push(...awakenedIds);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.security.some((c) => c.instanceId === s.inst("recovery").instanceId));

    const source = player.battleArea.find((p) => p.topCard?.instanceId === s.inst("source").instanceId);
    expect(source?.stack.map((c) => c.instanceId)).toEqual([s.inst("plainBlanc").instanceId]);
    for (const awakenedId of awakenedIds) expect(offeredCandidates(s, "BT7-082")).not.toContain(awakenedId);
    expect(player.hand.map((c) => c.instanceId)).toContain(awakenedIds[0]);
    expect(player.trash.map((c) => c.instanceId)).toContain(awakenedIds[1]);
  });

  it("[On Deletion] can return [BaoHuckmon], [SaviorHuckmon], or [Sistermon Ciel (Awakened)] from trash (Q1647)", async () => {
    for (const returnable of ["BT6-011", "BT6-015", "BT7-083"]) {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
          1: {
            battleArea: [{ card: "BT7-082", as: "blanc", suspended: true }],
            trash: [
              { card: "BT7-082", as: "excluded" },
              { card: returnable, as: "returnable" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      const owner = s.state.players[1] as PlayerState;
      const excludedId = s.inst("excluded").instanceId;
      const returnableId = s.inst("returnable").instanceId;
      preferInstanceIds.push(excludedId);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("blanc").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => owner.hand.length > 0);

      expect(owner.hand.map((c) => c.instanceId)).toEqual([returnableId]);
      expect(offeredCandidates(s, "BT7-082")).not.toContain(excludedId);
      expect(owner.trash.map((c) => c.instanceId)).toContain(excludedId);
    }
  });
});
