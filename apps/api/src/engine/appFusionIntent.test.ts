import { EffectDuration, Phase, type Intent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

function appFusionIntent(
  permanentId: string,
  instanceId: string,
  appFusionLinkInstanceId?: string,
): Extract<Intent, { type: "digivolve" }> {
  return {
    type: "digivolve",
    permanentId,
    instanceId,
    ...(appFusionLinkInstanceId === undefined ? {} : { appFusionLinkInstanceId }),
  };
}

describe("public App Fusion digivolve intent", () => {
  it.each([
    ["host-first", "BT26-051", "EX10-024"],
    ["link-first", "EX10-024", "BT26-051"],
  ])("uses the selected linked card for zero-cost App Fusion (%s)", async (_label, hostCard, linkCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: hostCard, as: "host", linked: [{ card: linkCard, as: "material" }] }],
          hand: [{ card: "BT25-036", as: "result" }],
          deck: [
            { card: "BT1-010", as: "draw" },
            { card: "BT1-013", as: "draw2" },
          ],
          security: [{ card: "BT1-001", as: "security" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(
        0,
        appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
      ),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard?.cardId === "BT25-036" &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001") &&
        s.state.players[0]!.security[0]?.cardId === "BT1-013" &&
        s.state.players[0]!.deck.length === 0,
    );
    expect(s.perm("host").topCard?.cardId).toBe("BT25-036");
    expect(s.perm("host").enteredByEffect).toBe(false);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", permanentId: s.perm("host").permanentId }),
    );
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([hostCard, linkCard]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("draw").instanceId,
      s.inst("security").instanceId,
    ]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("draw2").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("chooses the second eligible linked instance and retains the first", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-024",
              as: "host",
              linked: [
                { card: "BT26-051", as: "first" },
                { card: "BT26-051", as: "second" },
              ],
            },
          ],
          hand: [{ card: "BT25-036", as: "result" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(
      s.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    await s.ready();
    expect(
      s.engine.applyIntent(
        0,
        appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, s.inst("second").instanceId),
      ),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-036");
    expect(s.perm("host").topCard?.cardId).toBe("BT25-036");
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([
      s.inst("host").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("keeps the ordinary digivolve route and cost when no App Fusion link is selected", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const response = s.engine.applyIntent(0, appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId));
    expect(response).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["EX10-024"]);
  });

  it("uses the normal yellow Lv3 evolution cost without the App Fusion flag", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-045", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId))).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-036");
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").topCard?.cardId).toBe("BT25-036");
    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["EX10-024"]);
  });

  it("rejects a selected link that is not linked to the chosen host without mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] },
          { card: "BT26-051", as: "otherHost" },
        ],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const response = s.engine.applyIntent(
      0,
      appFusionIntent(s.perm("otherHost").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
    );
    expect(response).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);
    expect(s.perm("otherHost").topCard?.cardId).toBe("BT26-051");
    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["EX10-024"]);
  });

  it("rejects an unlinked, wrong-name, or wrong-zone selected material without mutation", async () => {
    const cases = [
      {
        label: "unlinked hand card",
        linked: [{ card: "EX10-024", as: "material" }],
        extra: { card: "BT26-051", as: "unlinked" },
      },
      { label: "wrong-name link", linked: [{ card: "BT1-010", as: "wrong" }], extra: undefined },
    ] as const;
    for (const fixture of cases) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT26-051", as: "host", linked: [...fixture.linked] }],
          hand: [{ card: "BT25-036", as: "result" }, ...(fixture.extra ? [fixture.extra] : [])],
        },
      });
      s.state.memory = 2;
      await s.ready();
      const selected = fixture.extra ? s.inst("unlinked").instanceId : s.inst("wrong").instanceId;
      const response = s.engine.applyIntent(
        0,
        appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, selected),
      );
      expect(response, fixture.label).toMatchObject({ ok: false });
      expect(s.state.memory, fixture.label).toBe(2);
      expect(s.perm("host").topCard?.cardId, fixture.label).toBe("BT26-051");
    }
  });

  it("rejects App Fusion from the wrong turn and from breeding without mutation", async () => {
    const wrongTurn = setupEngine({
      0: {
        battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    wrongTurn.state.turnSeat = 1;
    wrongTurn.state.memory = 2;
    await wrongTurn.ready();
    expect(
      wrongTurn.engine.applyIntent(
        0,
        appFusionIntent(
          wrongTurn.perm("host").permanentId,
          wrongTurn.inst("result").instanceId,
          wrongTurn.inst("material").instanceId,
        ),
      ),
    ).toMatchObject({ ok: false });
    expect(wrongTurn.state.memory).toBe(2);
    expect(wrongTurn.perm("host").linked).toHaveLength(1);

    const breeding = setupEngine({
      0: {
        breeding: { card: "BT26-051", as: "host", under: [{ card: "EX10-024", as: "material" }] },
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    breeding.state.memory = 2;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(
        0,
        appFusionIntent(
          breeding.perm("host").permanentId,
          breeding.inst("result").instanceId,
          breeding.inst("material").instanceId,
        ),
      ),
    ).toMatchObject({ ok: false });
    expect(breeding.state.memory).toBe(2);
  });

  it("rejects an opponent host and a result card that is not in hand", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-036", as: "result" }] },
      1: { battleArea: [{ card: "BT26-051", as: "enemy", linked: [{ card: "EX10-024", as: "material" }] }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(
        0,
        appFusionIntent(s.perm("enemy").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
      ),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);

    const missing = setupEngine({
      0: { battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }] },
    });
    missing.state.memory = 2;
    await missing.ready();
    expect(
      missing.engine.applyIntent(
        0,
        appFusionIntent(missing.perm("host").permanentId, "missing-result", missing.inst("material").instanceId),
      ),
    ).toMatchObject({ ok: false });
    expect(missing.state.memory).toBe(2);
  });

  it("rejects an incompatible alternate-cost flag without mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const response = s.engine.applyIntent(0, {
      ...appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
      useAlternateCost: true,
    });
    expect(response).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").linked).toHaveLength(1);
  });

  it("rejects the App Fusion declaration outside the main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.phase = Phase.End;
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(
        0,
        appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
      ),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);
  });

  it("applies a +1 digivolution-cost modifier to App Fusion and rejects insufficient memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    advance(s.engine).ledgers.modifiers.addEvoCostAdjustment(() => true, 1, false);
    expect(
      s.engine.applyIntent(
        0,
        appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
      ),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-036");
    expect(s.state.memory).toBe(1);

    const insufficient = setupEngine({
      0: {
        battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    insufficient.state.memory = 2;
    await insufficient.ready();
    advance(insufficient.engine).ledgers.modifiers.addEvoCostAdjustment(() => true, 13, false);
    expect(
      insufficient.engine.applyIntent(
        0,
        appFusionIntent(
          insufficient.perm("host").permanentId,
          insufficient.inst("result").instanceId,
          insufficient.inst("material").instanceId,
        ),
      ),
    ).toMatchObject({ ok: false });
    expect(insufficient.perm("host").topCard?.cardId).toBe("BT26-051");
  });

  it("rejects App Fusion while an unrelated optional decision is pending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "material" }] }],
          hand: [
            { card: "BT25-056", as: "boot" },
            { card: "BT26-010", as: "link" },
            { card: "BT25-036", as: "result" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boot").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pendingId = s.state.pendingDecision?.decisionId;
    expect(pendingId).toBeDefined();
    const response = s.engine.applyIntent(
      0,
      appFusionIntent(s.perm("host").permanentId, s.inst("result").instanceId, s.inst("material").instanceId),
    );
    expect(response).toMatchObject({ ok: false });
    expect(s.state.pendingDecision?.decisionId).toBe(pendingId);
    expect(s.perm("host").topCard?.cardId).toBe("BT26-051");
  });
});
