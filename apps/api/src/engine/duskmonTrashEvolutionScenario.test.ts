import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "./testkit/harness.js";

async function chooseObservedKaiserLeomon(s: EngineSetup) {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const destinations = s.decisions.at(-1)!.req;
  expect(destinations.options?.candidateInstanceIds).toEqual(["s0-20", "s0-12"]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: destinations.decisionId,
      response: { kind: "selectCards", instanceIds: ["s0-12"] },
    }),
  ).toEqual({ ok: true });
}

async function leaveBreeding(s: EngineSetup) {
  const seat = s.state.turnSeat;
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(seat);
}

it("Discord 1557790296379625482: plays both named trash evolutions through the real turn loop", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, declinePrompts: ["By deleting 1 level 4 or lower purple Digimon"] },
  );
  layDevScenario("arena-discord-1557790296379625482-trash-hybrids", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    for (const [source, into, memory] of [
      ["BT18-078", "BT18-079", 2],
      ["BT18-076", "BT18-077", 1],
    ] as const) {
      const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === source)!;
      const destination = s.state.players[0]!.trash.find((c) => c.cardId === into)!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: host.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const req = s.decisions.at(-1)!.req;
      expect(req.sourceCardId).toBe(source);
      expect(req.options?.candidateInstanceIds).toContain(host.permanentId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "chooseTargets", instanceIds: [host.permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => host.topCard.instanceId === destination.instanceId && s.state.pendingDecision === undefined);
      await advance(s.engine).finishAttack();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(memory);
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(destination.instanceId);
    }
    expect(s.state.players[1]!.security).toHaveLength(3);
    assertNoLoudGap(s);
  } finally {
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  }
});

it.each(["perm-2", "perm-1", "perm-5"])(
  "Discord 1557790296379625482: observed Loweemon prompt resolves host %s through public intents",
  async (hostId) => {
    const options = { autoAcceptOptional: true, autoDeclineOptional: false, autoOrderTriggers: false };
    const s = setupEngine({ 0: {}, 1: {} }, options);
    layDevScenario("arena-discord-1557790296379625482-loweemon-hosts", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: "perm-5",
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const order = s.decisions.at(-1)!.req;
      expect(order.options?.triggerCardIds).toEqual(["BT18-076", "BT18-094"]);
      options.autoOrderTriggers = true;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: order.decisionId,
          response: { kind: "orderTriggers", order: order.options!.triggerKeys! },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const hosts = s.decisions.at(-1)!.req;
      expect(hosts.sourceCardId).toBe("BT18-076");
      expect(hosts.sourceInstanceId).toBe("s0-18");
      expect(hosts.options?.candidateInstanceIds).toEqual(["perm-2", "perm-1", "perm-5"]);
      expect(hosts.options).toMatchObject({ min: 0, max: 1 });
      options.autoAcceptOptional = false;
      options.autoDeclineOptional = true;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: hosts.decisionId,
          response: { kind: "chooseTargets", instanceIds: [hostId] },
        }),
      ).toEqual({ ok: true });
      if (hostId !== "perm-5") {
        await chooseObservedKaiserLeomon(s);
      }
      const host = s.state.players[0]!.battleArea.find((p) => p.permanentId === hostId)!;
      await settle(() => host.topCard.instanceId === "s0-12");
      await advance(s.engine).finishAttack();
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.events).toContainEqual(
        expect.objectContaining({
          kind: "memoryChanged",
          from: 2,
          to: hostId === "perm-5" ? 1 : -2,
          reason: "digivolve",
        }),
      );
      expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain("s0-12");
      assertNoLoudGap(s);
    } finally {
      if (s.state.phase === Phase.Breeding) {
        await leaveBreeding(s);
      }
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  },
);
