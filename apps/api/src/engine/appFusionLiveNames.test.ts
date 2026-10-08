/* oxlint-disable vitest/no-conditional-expect -- Table inputs select fixed contracts; branches never depend on observed game state. */
import { EffectDuration, type Intent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { compiled as tamer } from "../cards/BT25/BT25-089.js";
import { runAppFuse } from "./effects/interpreter/actions/dna.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "./testkit/harness.js";
import { internalsOf } from "./testkit/internals.js";
import { observe } from "./testkit/observe.js";

function fusionBoard(reverse = false, decisions?: SetupEngineOptions) {
  return setupEngine(
    {
      0: {
        battleArea: [
          {
            card: reverse ? "EX10-030" : "EX10-019",
            as: "host",
            under: [{ card: "BT1-009", as: "source" }],
            linked: [{ card: reverse ? "EX10-019" : "EX10-030", as: "link" }],
          },
          { card: "BT25-089", as: "tamer" },
        ],
        hand: [
          { card: "EX10-073", as: "result" },
          { card: "EX10-073", as: "alternateResult" },
        ],
        deck: ["BT1-010", "BT1-011"],
      },
    },
    decisions ?? { autoDeclineOptional: true, autoSelectCards: true },
  );
}

function snapshot(s: ReturnType<typeof fusionBoard>) {
  const host = s.perm("host");
  const player = s.state.players[0]!;
  return {
    top: host.topCard.instanceId,
    stack: host.stack.map(({ instanceId }) => instanceId),
    linked: host.linked.map(({ instanceId }) => instanceId),
    hand: player.hand.map(({ instanceId }) => instanceId),
    deck: player.deck.map(({ instanceId }) => instanceId),
    trash: player.trash.map(({ instanceId }) => instanceId),
    memory: s.state.memory,
  };
}

const paths = ["public", "compatibility", "legacy compatibility", "effect selection", "primitive"] as const;
const grants = ["effect", "Rule", "contains only", "DigiXros only", "substring", "none"] as const;

describe("Discord 1557555301014569070: production App Fusion live-name consumers", () => {
  for (const reverse of [false, true]) {
    it.each(paths.flatMap((path) => grants.map((grant) => ({ path, grant }))))(
      `${reverse ? "Cometmon" : "Warudamon"} host: $path respects $grant names after original-name replacement`,
      async ({ path, grant }) => {
        const s = fusionBoard(reverse);
        await s.ready();
        const host = s.perm("host");
        const ledger = advance(s.engine).ledgers.continuous;
        const alias = reverse ? "cOmEtMoN" : "wArUdAmOn";
        // Rule identity exists before the rewrite, whereas effect identity survives it.
        if (grant !== "none") {
          ledger.addNameTraitGrant(
            host.permanentId,
            "name",
            [grant === "substring" ? `${alias} X Antibody` : alias],
            EffectDuration.Permanent,
            {
              fromRule: grant === "Rule",
              nameContainsOnly: grant === "contains only",
              digiXrosOnly: grant === "DigiXros only",
            },
          );
        }
        if (grant === "Rule") expect(observe(s.engine).effectiveNames(host)).toContain(alias.toLowerCase());
        ledger.addOriginalCardInfoOverride(host.permanentId, { name: "Sukamon" }, EffectDuration.Permanent);
        await s.engine.recomputeContinuousEffects();
        const legal = grant === "effect";
        expect(s.inst("result").appFusionRoutes).toHaveLength(legal ? 1 : 0);
        const before = snapshot(s);
        if (path === "primitive") {
          const result = await internalsOf(s.engine).primitives.appFuseInto(
            host.permanentId,
            s.inst("result").instanceId,
            s.inst("link").instanceId,
          );
          expect(result).toBe(legal ? host : undefined);
        } else if (path === "effect selection") {
          const internals = internalsOf(s.engine);
          const ctx = internals.buildEffectContext(internals.cardSourceOf(s.inst("tamer")), {});
          const action = tamer.effects.find(({ trigger }) => trigger === "EndOfYourTurn")!.actions[0]!;
          if (action.kind !== "AppFuse") throw new Error("Missing production AppFuse action");
          await runAppFuse(ctx, { ...action, optional: false });
          expect(
            s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(s.inst("result").instanceId)),
          ).toBe(legal);
        } else {
          const intent: Intent =
            path === "public"
              ? {
                  type: "appFusion",
                  permanentId: host.permanentId,
                  instanceId: s.inst("result").instanceId,
                  linkedInstanceId: s.inst("link").instanceId,
                }
              : {
                  type: "digivolve",
                  permanentId: host.permanentId,
                  instanceId: s.inst("result").instanceId,
                  ...(path === "compatibility"
                    ? { appFusionLinkInstanceId: s.inst("link").instanceId }
                    : { appFusionLinkedInstanceId: s.inst("link").instanceId }),
                };
          const response = s.engine.applyIntent(0, intent);
          expect(response.ok).toBe(legal);
          await settle(() =>
            legal ? host.topCard.cardId === "EX10-073" && s.state.pendingDecision === undefined : true,
          );
        }
        if (legal) {
          expect(host.topCard.cardId).toBe("EX10-073");
          expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([
            ...before.stack,
            before.top,
            s.inst("link").instanceId,
          ]);
          expect(host.linked).toHaveLength(0);
          expect(s.state.players[0]!.deck).toHaveLength(before.deck.length - 1);
          expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(before.trash);
          expect(s.state.memory).toBe(before.memory);
        } else {
          expect(snapshot(s)).toEqual(before);
          expect(s.events.some(({ kind }) => kind === "digivolved")).toBe(false);
        }
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );
  }

  it.each(["no physical link", "unrelated link", "two Warudamon-only materials"] as const)(
    "never counts two host identities as two materials: %s",
    async (pair) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX10-019",
                as: "host",
                linked:
                  pair === "no physical link"
                    ? []
                    : [{ card: pair === "unrelated link" ? "EX10-017" : "EX10-019", as: "link" }],
              },
            ],
            hand: [{ card: "EX10-073", as: "result" }],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      const host = s.perm("host");
      if (pair !== "two Warudamon-only materials")
        advance(s.engine).ledgers.continuous.addNameTraitGrant(
          host.permanentId,
          "name",
          ["Cometmon"],
          EffectDuration.Permanent,
        );
      await s.ready();
      expect(s.inst("result").appFusionRoutes).toHaveLength(0);
      const before = snapshot(s);
      expect(
        s.engine.applyIntent(0, {
          type: "appFusion",
          permanentId: host.permanentId,
          instanceId: s.inst("result").instanceId,
          linkedInstanceId: pair === "no physical link" ? "missing-link" : s.inst("link").instanceId,
        }).ok,
      ).toBe(false);
      expect(
        await internalsOf(s.engine).primitives.appFuseInto(host.permanentId, s.inst("result").instanceId),
      ).toBeUndefined();
      expect(snapshot(s)).toEqual(before);
    },
  );

  it.each(["public", "primitive"] as const)(
    "%s assigns overlapping aliases to separate physical materials and preserves an unrelated second link",
    async (path) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX10-019",
                as: "host",
                linked: [
                  { card: "EX10-017", as: "unrelated" },
                  { card: "EX10-019", as: "link" },
                ],
              },
            ],
            hand: [{ card: "EX10-073", as: "result" }],
            deck: ["BT1-010", "BT1-011"],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      const host = s.perm("host");
      const ledger = advance(s.engine).ledgers.continuous;
      ledger.addLinkMaxGrant(host.permanentId, 1, EffectDuration.Permanent);
      ledger.addNameTraitGrant(host.permanentId, "name", ["cOmEtMoN"], EffectDuration.Permanent);
      await s.ready();
      expect(observe(s.engine).effectiveNames(host)).toEqual(["warudamon", "cometmon"]);
      expect(s.inst("result").appFusionRoutes.map(({ linkedInstanceId }) => linkedInstanceId)).toEqual([
        s.inst("link").instanceId,
      ]);
      const before = snapshot(s);
      if (path === "primitive") {
        expect(
          await internalsOf(s.engine).primitives.appFuseInto(
            host.permanentId,
            s.inst("result").instanceId,
            s.inst("link").instanceId,
          ),
        ).toBe(host);
      } else {
        expect(
          s.engine.applyIntent(0, {
            type: "appFusion",
            permanentId: host.permanentId,
            instanceId: s.inst("result").instanceId,
            linkedInstanceId: s.inst("link").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(() => host.topCard.cardId === "EX10-073" && s.state.pendingDecision === undefined);
      }
      expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([before.top, s.inst("link").instanceId]);
      expect(host.linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("unrelated").instanceId]);
      expect(s.state.players[0]!.deck).toHaveLength(before.deck.length - 1);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.memory).toBe(before.memory);
    },
  );

  it("primitive revalidates names after an awaited physical link choice even with a cost override", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-019",
              as: "host",
              linked: [
                { card: "EX10-030", as: "first" },
                { card: "EX10-030", as: "second" },
              ],
            },
          ],
          hand: [{ card: "EX10-073", as: "result" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true },
    );
    const host = s.perm("host");
    const ledger = advance(s.engine).ledgers.continuous;
    ledger.addLinkMaxGrant(host.permanentId, 1, EffectDuration.Permanent);
    await s.ready();
    const before = snapshot(s);
    const promise = internalsOf(s.engine).primitives.appFuseInto(
      host.permanentId,
      s.inst("result").instanceId,
      undefined,
      1,
    );
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision;
    if (pending === undefined) throw new Error("Physical link choice did not open");
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    ledger.addOriginalCardInfoOverride(host.permanentId, { name: "Sukamon" }, EffectDuration.Permanent);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await expect(promise).resolves.toBeUndefined();
    expect(snapshot(s)).toEqual(before);
    expect(s.events.some(({ kind }) => kind === "digivolved")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["rewrite", "alias removal", "healthy"] as const)(
    "primitive revalidates %s during wouldDigivolve before consuming payment, result, link, stack or draw",
    async (mutation) => {
      const decisions = { autoDeclineOptional: false, autoSelectCards: true };
      const s = fusionBoard(false, decisions);
      await s.ready();
      const host = s.perm("host");
      const ledger = advance(s.engine).ledgers.continuous;
      if (mutation === "alias removal") {
        ledger.addOriginalCardInfoOverride(host.permanentId, { name: "Sukamon" }, EffectDuration.Permanent);
        ledger.addNameTraitGrant(host.permanentId, "name", ["Warudamon"], EffectDuration.UntilEachTurnEnd);
      }
      const internals = internalsOf(s.engine);
      const ctx = internals.buildEffectContext(internals.cardSourceOf(host.topCard), {});
      // No printed card currently rewrites names in this hook. A production decision
      // deliberately parks the actual primitive so its transaction guard can be tested.
      advance(s.engine).ledgers.subTriggers.subscribeReplacement({
        event: "wouldDigivolve",
        sourcePermanentId: host.permanentId,
        mode: "instead",
        appliesTo: () => true,
        apply: async () => {
          await ctx.ask.optional(ctx, "App Fusion live-name mutation probe");
        },
        description: "App Fusion live-name transaction probe",
      });
      const before = snapshot(s);
      const promise = internals.primitives.appFuseInto(
        host.permanentId,
        s.inst("result").instanceId,
        s.inst("link").instanceId,
        1,
      );
      await settle(() => s.state.pendingDecision?.kind === "optional");
      if (mutation === "rewrite")
        ledger.addOriginalCardInfoOverride(host.permanentId, { name: "Sukamon" }, EffectDuration.Permanent);
      else if (mutation === "alias removal") ledger.sweep(s.state, "eachTurnEnd", 0);
      expect(observe(s.engine).effectiveNames(host)).toEqual([mutation === "healthy" ? "warudamon" : "sukamon"]);
      const pending = s.state.pendingDecision;
      if (pending === undefined) throw new Error("Mutation decision did not open");
      decisions.autoDeclineOptional = true;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      if (mutation === "healthy") {
        await expect(promise).resolves.toBe(host);
        expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([
          ...before.stack,
          before.top,
          s.inst("link").instanceId,
        ]);
        expect(s.state.players[0]!.deck).toHaveLength(before.deck.length - 1);
        expect(s.state.memory).toBe(before.memory - 1);
      } else {
        await expect(promise).resolves.toBeUndefined();
        expect(snapshot(s)).toEqual(before);
        expect(s.events.some(({ kind }) => kind === "digivolved")).toBe(false);
      }
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});
