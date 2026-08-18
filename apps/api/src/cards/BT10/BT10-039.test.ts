import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-039.js";
import "./BT10-109.js";
describe("BT10-039 Taomon", () => {
  it("uses a Plug-In Option from hand without cost or color requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [
            { card: "BT10-039", as: "evolving" },
            { card: "BT10-109", as: "plugin" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").currentDP === 11000 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("plugin").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
    expect(s.perm("base").currentDP).toBe(11000);
    assertNoLoudGap(s);
  });

  it("allows declining the optional free Plug-In use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [
            { card: "BT10-039", as: "evolving" },
            { card: "BT10-109", as: "plugin" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const pluginId = s.inst("plugin").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "confirm");

    const pending = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "optional",
      sourceCardId: "BT10-039",
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === pluginId)).toBe(true);
    expect(s.perm("base").currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
