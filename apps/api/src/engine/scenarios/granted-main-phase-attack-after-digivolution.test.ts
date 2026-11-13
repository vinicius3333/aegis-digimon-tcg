import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { SequencedServerEvent } from "@aegis/shared";
import { advance } from "#api/engine/testkit/advance";
import { settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";

const record = JSON.parse(
  readFileSync(new URL("./granted-main-phase-attack-after-digivolution.replay.json", import.meta.url), "utf8"),
) as ReplayRecord;

const grantedAttack = "[Granted] [Start of Your Main Phase] This Digimon attacks.";

it("keeps a granted start-of-main-phase attack pending after its Digimon digivolves in the same window", async () => {
  const events: SequencedServerEvent[] = [];
  const replay = await runReplay(record, { onBatch: (_state, batch) => events.push(...batch) });
  try {
    expect(replay.divergences).toEqual([]);
    const recipient = replay.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === "perm-3")!;
    expect(recipient.topCard?.cardId).toBe("BT25-037");
    expect(recipient.stack.map((card) => card.cardId)).toContain("P-197");
    expect(recipient.isSuspended).toBe(false);

    const order = replay.state.pendingDecision!;
    expect(order).toMatchObject({ seat: 1, kind: "orderTriggers" });
    const descriptions = (JSON.parse(order.payloadJson) as { triggerDescriptions: string[] }).triggerDescriptions;
    expect(descriptions).toContain(grantedAttack);
    expect(
      await replay.applyIntent(1, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [], orderIndexes: [descriptions.indexOf(grantedAttack)] },
      }),
    ).toEqual({ ok: true });

    expect(replay.state.pendingDecision).toMatchObject({ seat: 1, kind: "selectCards" });
    expect(
      await replay.applyIntent(1, {
        type: "respondDecision",
        decisionId: replay.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });

    expect(events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        seat: 1,
        attackerPermanentId: "perm-3",
        attackerCardId: "BT25-037",
        target: { kind: "player" },
      }),
    );
    expect(recipient.isSuspended).toBe(true);
  } finally {
    await replay.applyIntent(0, { type: "surrender" });
  }
});

it.each([
  { granter: "P-240", memory: 10 },
  { granter: "BT21-077", memory: 4 },
])(
  "makes a Digimon with no digivolution cards attack after $granter grants the attack and it digivolves first",
  async ({ granter, memory }) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: granter, as: "granter" },
            { card: "EX12-007", as: "discard" },
          ],
          trash: ["EX12-007", "EX12-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "P-197", as: "recipient" }],
          hand: [{ card: "BT25-037", as: "evolution" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const recipientId = s.perm("recipient").permanentId;
    s.state.memory = memory;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("granter").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === recipientId),
      );
      const recipient = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === recipientId)!;
      expect(recipient.topCard?.cardId).toBe("BT25-037");
      expect(recipient.stack.map((card) => card.cardId)).toEqual(["P-197"]);
      expect(recipient.isSuspended).toBe(true);
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("granter").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
