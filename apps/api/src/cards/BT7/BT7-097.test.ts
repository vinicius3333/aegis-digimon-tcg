import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-097.js";

describe("BT7-097 Tidal Wave", () => {
  it("binds the selected host stack and delegates Security to Main", () => {
    const compiled = runtimeCompiledCard("BT7-097");
    expect(compiled?.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "hasAny" },
            count: 1,
            bindAs: "chosenHost",
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              kind: ["Digimon"],
              hostFilter: { boundRef: "chosenHost" },
            },
            count: 2,
            upTo: true,
          },
        },
      ],
    });
    expect(compiled?.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    });
  });

  it("plays two Digimon from one chosen digivolution stack unsuspended and without cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-018",
              as: "host",
              under: [
                { card: "BT7-019", as: "first" },
                { card: "BT7-020", as: "second" },
              ],
            },
          ],
          hand: [{ card: "BT7-097", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    const played = s.state.players[0]!.battleArea.filter(
      (permanent) =>
        permanent.topCard.instanceId === s.inst("first").instanceId ||
        permanent.topCard.instanceId === s.inst("second").instanceId,
    );
    expect(played).toHaveLength(2);
    expect(played.every((permanent) => !permanent.isSuspended)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("allows choosing zero cards because the printed count is up to two", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-018", as: "host", under: [{ card: "BT7-019", as: "source" }] }],
        hand: [{ card: "BT7-097", as: "option" }],
      },
    });
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const hostDecision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hostDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("host").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
