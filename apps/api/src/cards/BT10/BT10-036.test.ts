import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-036.js";

describe("BT10-036 Kyubimon", () => {
  it("returns only a Plug-In Option from trash through its first modal choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "base" }],
          hand: [{ card: "BT10-036", as: "evolving" }],
          trash: [
            { card: "BT10-105", as: "plugin" },
            { card: "BT10-109", as: "otherPlugin" },
            { card: "BT4-111", as: "unrelatedOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: false, autoSelectCards: false },
    );
    const pluginId = s.inst("plugin").instanceId;
    const otherPluginId = s.inst("otherPlugin").instanceId;
    const unrelatedId = s.inst("unrelatedOption").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.at(-1)?.req.kind === "chooseOption");

    const modal = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseOption",
      sourceCardId: "BT10-036",
      options: { choices: ["Return 1 to hand", "Draw 2"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: modal.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.at(-1)?.req.kind === "selectCards");

    const selection = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "BT10-036",
      options: { min: 1, max: 1 },
    });
    expect(new Set(s.decisions.at(-1)!.req.options?.candidateInstanceIds)).toEqual(new Set([pluginId, otherPluginId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [pluginId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === pluginId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === unrelatedId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes a Plug-In from hand as the second mode's cost, then draws 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "base" }],
          hand: [
            { card: "BT10-036", as: "evolving" },
            { card: "BT10-105", as: "plugin" },
          ],
          deck: [
            { card: "BT1-001", as: "drawnOne" },
            { card: "BT1-002", as: "drawnTwo" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoSelectCards: true,
        preferOptionIndex: 1,
      },
    );
    const pluginId = s.inst("plugin").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === pluginId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawnTwo").instanceId),
    );

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === pluginId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("allows declining the entire optional modal effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "base" }],
          hand: [
            { card: "BT10-036", as: "evolving" },
            { card: "BT10-105", as: "plugin" },
          ],
          trash: [{ card: "BT10-109", as: "trashPlugin" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: false },
    );
    const handPluginId = s.inst("plugin").instanceId;
    const trashPluginId = s.inst("trashPlugin").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "confirm");

    const pending = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT10-036" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === handPluginId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === trashPluginId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
