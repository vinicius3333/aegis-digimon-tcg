import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-039.js";
import "./BT7-040.js";

describe("BT7-039 Stefilmon", () => {
  it("places up to 2 yellow level-4-or-lower Digimon under itself and draws per card placed", async () => {
    const s = setupEngine(
      {
        0: {
          // Legal yellow stack: L4 Filmon -> L5 Stefilmon.
          battleArea: [{ card: "BT7-039", under: ["BT7-034"], as: "stefilmon" }],
          hand: ["BT1-048", "BT1-049"],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("stefilmon"));

    expect(s.perm("stefilmon").stack).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("lets the UI choose which selected yellow card is the bottom source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-039",
              under: [{ card: "BT7-034", as: "existingSource" }],
              as: "stefilmon",
            },
          ],
          hand: [
            { card: "BT1-048", as: "firstYellow" },
            { card: "BT1-049", as: "secondYellow" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );

    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("stefilmon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.decisions.at(-1)!.req;
    const selected = [s.inst("firstYellow").instanceId, s.inst("secondYellow").instanceId];
    expect(selection.options?.visibleCards).toEqual([
      { instanceId: selected[0]!, cardId: "BT1-048" },
      { instanceId: selected[1]!, cardId: "BT1-049" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: selected },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const stackOrder = [selected[1]!, selected[0]!];
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: stackOrder },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("stefilmon").stack.map((card) => card.instanceId)).toEqual([
      ...stackOrder,
      s.inst("existingSource").instanceId,
    ]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("gives one own Digimon Security Attack +1 after being trashed for Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Legal yellow stack: L4 Filmon -> L5 Stefilmon -> L6 Rasenmon.
            { card: "BT7-040", under: ["BT7-034", { card: "BT7-039", as: "stefilmon" }], as: "host" },
            { card: "BT1-010", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("stefilmon").instanceId);
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-040/"),
    )!.effectKey;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1 ||
        observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack") === 1,
    );

    expect(
      observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") +
        observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack"),
    ).toBe(1);
  });
});
