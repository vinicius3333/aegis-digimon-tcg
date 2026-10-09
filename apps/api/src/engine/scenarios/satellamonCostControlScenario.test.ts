import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

const SOURCE = "dev-satellamon-source";
const HOST = "dev-perm-0-satellamon-host";

describe("Discord 1557702941106901032 Satellamon candidate control (unresolved report)", () => {
  it.each(["dev-satellamon-hand-0", "dev-satellamon-trash-3"])(
    "resolves the 13-visible/9-eligible cost using %s and leaves Main playable",
    async (costId) => {
      const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
      layDevScenario("arena-bt21-satellamon-cost-control", s.state, [BLUE_DECK, RED_DECK]);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: SOURCE })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const cost = s.decisions.at(-1)!.req;
      expect(cost.sourceInstanceId).toBe(SOURCE);
      expect(cost.options?.visibleInstanceIds).toHaveLength(13);
      expect(cost.options?.candidateInstanceIds).toHaveLength(9);
      expect(cost.options?.candidateInstanceIds).toContain("dev-satellamon-hand-0");
      expect(cost.options?.candidateInstanceIds).not.toContain(SOURCE);
      expect(cost.options?.candidateInstanceIds).not.toContain("dev-satellamon-draw");
      // A visible ineligible card cannot dismiss the real pending choice.
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: cost.decisionId,
          response: { kind: "selectCards", instanceIds: ["dev-satellamon-draw"] },
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.pendingDecision?.decisionId).toBe(cost.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: cost.decisionId,
          response: { kind: "selectCards", instanceIds: [costId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const target = s.decisions.at(-1)!.req;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: target.decisionId,
          response: { kind: "chooseTargets", instanceIds: [HOST] },
        }),
      ).toEqual({ ok: true });
      const human = s.state.players[0]!;
      const host = human.battleArea.find(({ permanentId }) => permanentId === HOST)!;
      await settle(() => s.state.pendingDecision === undefined && observe(s.engine).isRestricted(host, "beReturned"));
      expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([costId]);
      expect(observe(s.engine).isRestricted(host, "cantBeDeDigivolved")).toBe(true);
      expect(human.battleArea.some(({ topCard }) => topCard.instanceId === SOURCE)).toBe(true);
      expect([...human.hand, ...human.trash].some(({ instanceId }) => instanceId === costId)).toBe(false);
      expect(s.state.memory).toBe(3);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );

  it("declines the cost without moving a card or protecting a host, then accepts the next public action", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt21-satellamon-cost-control", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: SOURCE })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const cost = s.decisions.at(-1)!.req;
    const human = s.state.players[0]!;
    const before = [...human.hand, ...human.trash].map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await advance(s.engine).waitForMainPhase(0);
    expect([...human.hand, ...human.trash].map(({ instanceId }) => instanceId)).toEqual(before);
    const host = human.battleArea.find(({ permanentId }) => permanentId === HOST)!;
    expect(host.stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(host, "beReturned")).toBe(false);
    expect(observe(s.engine).isRestricted(host, "cantBeDeDigivolved")).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
