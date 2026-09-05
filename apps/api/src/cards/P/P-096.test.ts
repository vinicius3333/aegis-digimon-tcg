import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-096.js";

describe("P-096 Prism Garrett", () => {
  it("does not waive its purple requirement for a non-Hunter Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX2-061"],
        hand: [{ card: "P-096", as: "option" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("places the only available Save card and grants exactly +1000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-087", as: "hunter" },
            { card: "BT10-020", as: "recipient" },
          ],
          hand: [{ card: "P-096", as: "option" }],
          trash: [{ card: "BT10-029", as: "saved" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const recipient = s.perm("recipient");
    const baseDP = recipient.baseDP;
    const savedId = s.inst("saved").instanceId;
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => recipient.stack.some((card) => card.instanceId === savedId) && recipient.currentDP === baseDP + 1000,
    );

    expect(recipient.stack.some((card) => card.instanceId === savedId)).toBe(true);
    expect(recipient.currentDP).toBe(baseDP + 1000);
    assertNoLoudGap(s);
  });

  it("Q4183 combines Save cards from a Tamer and trash in one 0–2 selection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT12-087",
              as: "hunter",
              under: [{ card: "BT10-020", as: "underTamer" }],
            },
            { card: "BT10-029", as: "recipient" },
          ],
          hand: [{ card: "P-096", as: "option" }],
          trash: [{ card: "BT10-034", as: "fromTrash" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const recipient = s.perm("recipient");
    const baseDP = recipient.baseDP;
    const sourceIds = [s.inst("underTamer").instanceId, s.inst("fromTrash").instanceId];
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;

    expect(request.sourceCardId).toBe("P-096");
    expect(request.options?.min).toBe(0);
    expect(request.options?.max).toBe(2);
    expect(request.options?.candidateInstanceIds).toEqual(expect.arrayContaining(sourceIds));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: sourceIds },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        sourceIds.every((id) => recipient.stack.some((card) => card.instanceId === id)) &&
        recipient.currentDP === baseDP + 2000,
    );

    expect(sourceIds.every((id) => recipient.stack.some((card) => card.instanceId === id))).toBe(true);
    expect(s.perm("hunter").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).not.toEqual(
      expect.arrayContaining(sourceIds.map((instanceId) => expect.objectContaining({ instanceId }))),
    );
    expect(recipient.currentDP).toBe(baseDP + 2000);
    assertNoLoudGap(s);
  });

  it("allows placing zero Save cards and grants no DP when zero were placed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-087", as: "hunter" },
            { card: "BT10-020", as: "recipient" },
          ],
          hand: [{ card: "P-096", as: "option" }],
          trash: [{ card: "BT10-029", as: "availableSave" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const recipient = s.perm("recipient");
    const baseDP = recipient.baseDP;
    const availableId = s.inst("availableSave").instanceId;
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.min).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "P-096"));

    expect(recipient.stack.some((card) => card.instanceId === availableId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === availableId)).toBe(true);
    expect(recipient.currentDP).toBe(baseDP);
    assertNoLoudGap(s);
  });

  it("Security adds this card to its owner's hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-096", as: "securityOption" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(
      false,
    );
    assertNoLoudGap(s);
  });
});
