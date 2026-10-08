import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle, drainMicrotasks, type EngineSetup } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

// The actual client/server preference is orderTriggers.optionalAnswers, scoped to one window.
// Local action-confirmation settings are not sent in the room intent protocol.
const cases = [
  ["EX10-032", "P-167", "dedigivolve"],
  ["EX10-032", "EX8-048", "delete"],
  ["EX10-032", "EX10-032", "dedigivolve"],
  ["EX10-032", "EX11-038", "draw"],
  ["EX10-032", "EX8-047", "delete"],
  ["EX11-044", "EX8-005", "memory"],
  ["EX10-036", "EX8-005", "memory"],
] as const;

function expectEqual(actual: unknown, expected: unknown): void {
  expect(actual).toEqual(expected);
}

async function drainChoices(s: EngineSetup, actor: string): Promise<void> {
  let parentAccepted = false;
  for (let round = 0; round < 100; round++) {
    await drainMicrotasks(4);
    const pending = s.state.pendingDecision;
    if (pending === undefined) continue;
    const req = s.decisions.find(({ req: candidate }) => candidate.decisionId === pending.decisionId)!.req;
    if (req.kind !== "optional") continue;
    // In Ask mode accept the attack cost; refuse the newly-triggered optional replenishment.
    const accept =
      req.sourceCardId === actor &&
      !parentAccepted &&
      req.options?.timing === "WhenAttacking" &&
      !/placing 3/i.test(req.promptText);
    if (accept) parentAccepted = true;
    expect(
      s.engine.applyIntent(req.seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
  }
}

describe.each(cases)("GitHub 5291 %s cost trashes %s (%s)", (actor, child, outcome) => {
  it.each(["ask", "yes", "no"] as const)(
    "honors the real %s optional preset without losing mandatory child effects",
    async (mode) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: actor,
                as: "actor",
                under: [
                  { card: child, as: "child" },
                  ...(actor !== "EX10-032"
                    ? [
                        { card: "BT4-065", as: "fuel1" },
                        { card: "BT4-065", as: "fuel2" },
                      ]
                    : []),
                  { card: "BT8-001", as: "gurimon" },
                ],
              },
            ],
            deck: Array(12).fill("BT1-009"),
          },
          1: {
            battleArea: [
              { card: "BT1-087", as: "tamer" },
              { card: "EX10-028", as: "victim", under: ["BT1-009"], suspended: true },
            ],
            security: 5,
          },
        },
        { autoSelectCards: true, autoOrderTriggers: false },
      );
      await s.ready();
      s.state.memory = 6;
      const handBefore = s.state.players[0]!.hand.length;
      const victimId = s.perm("victim").permanentId;
      const bus = await observe(s.engine).captureSubTriggers(async () => {
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: s.perm("actor").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
        const order = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
        const keys = order.options!.triggerKeys!;
        const actorKeys = keys.filter((_, i) => order.options!.triggerCardIds![i] === actor);
        expect(actorKeys.length).toBeGreaterThan(0);
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: order.decisionId,
            response: {
              kind: "orderTriggers",
              order: [...actorKeys, ...keys.filter((key) => !actorKeys.includes(key))],
              optionalAnswers: mode === "ask" ? {} : Object.fromEntries(actorKeys.map((key) => [key, mode === "yes"])),
            },
          }),
        ).toEqual({ ok: true });
        await drainChoices(s, actor);
        // New simultaneous windows (e.g. a refill alongside Gurimon) retain their own choice.
        for (let round = 0; round < 10 && s.state.pendingDecision?.kind === "orderTriggers"; round++) {
          const req = s.decisions.findLast(({ req: candidate }) => candidate.kind === "orderTriggers")!.req;
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: req.decisionId,
              response: { kind: "orderTriggers", order: req.options!.triggerKeys! },
            }),
          ).toEqual({ ok: true });
          await drainChoices(s, actor);
        }
        await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
      });
      const paid = mode !== "no";
      expect(
        bus.some(
          ({ event, payload }) =>
            event === "onDigivolutionCardsDiscardedBatch" &&
            payload.trashedDigivolutionInstanceIds?.includes(s.inst("child").instanceId),
        ),
      ).toBe(paid);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("child").instanceId)).toBe(paid);
      expect(s.state.memory).toBe(outcome === "memory" && paid ? 7 : 6);
      expect(s.state.players[0]!.hand.length - handBefore).toBe(outcome === "draw" && paid ? 2 : 1);
      if (outcome === "dedigivolve") expectEqual(s.perm("victim").topCard.cardId, paid ? "BT1-009" : "EX10-028");
      if (outcome === "delete")
        expectEqual(
          s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimId),
          !paid,
        );
      expect(
        s.decisions.filter(
          ({ req }) =>
            req.kind === "optional" &&
            req.sourceCardId === actor &&
            req.options?.timing === "WhenAttacking" &&
            !/placing 3/i.test(req.promptText),
        ).length > 0,
      ).toBe(mode === "ask");
      expect(
        s.decisions.some(
          ({ req }) => req.kind === "optional" && req.sourceCardId === child && req.options?.isInherited,
        ),
      ).toBe(false);
    },
  );
});
