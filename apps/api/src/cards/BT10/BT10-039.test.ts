import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-036.js";
import { compiled } from "./BT10-039.js";
import "./BT10-109.js";
describe("BT10-039 Taomon", () => {
  it("encodes one optional, free, color-waived Plug-In use from hand", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          expect.objectContaining({
            kind: "UseOptionWithoutCost",
            target: expect.objectContaining({
              count: 1,
              from: ["hand"],
              filter: expect.objectContaining({
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
              }),
            }),
            payCost: false,
            optional: true,
            waiveColorRequirement: true,
          }),
        ],
      }),
    ]);
  });

  it("uses a Plug-In Option from hand without cost or color requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-036", as: "base" }],
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
    expect(s.perm("base").topCard.cardId).toBe("BT10-039");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT10-036");
    expect(s.state.memory).toBe(0); // only Taomon's evolution cost 3; the white Option is free.
    assertNoLoudGap(s);
  });

  it("allows declining the optional free Plug-In use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-036", as: "base" }],
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

  it("offers only Option cards with Plug-In in their name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-036", as: "base" }],
          hand: [
            { card: "BT10-039", as: "evolving" },
            { card: "BT10-109", as: "plugin" },
            { card: "BT1-109", as: "otherOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([s.inst("plugin").instanceId]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("otherOption").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
