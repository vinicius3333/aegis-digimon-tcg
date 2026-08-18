import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-090.js";

describe("BT10-090 Zenjiro Tsurugi", () => {
  it("may play Ballistamon from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-090", as: "source" },
            { card: "BT10-049", as: "ballistamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((p) => p.topCard.instanceId === s.inst("ballistamon").instanceId));
    expect(s.state.memory).toBe(0);
  });

  it("offers Ballistamon from hand or under a Tamer, excludes one under a Digimon, then gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-087",
              as: "taiki",
              under: [{ card: "BT10-049", as: "underTamer" }],
            },
            {
              card: "BT10-009",
              as: "xrosHeartDigimon",
              under: [{ card: "BT10-049", as: "underDigimon" }],
            },
          ],
          hand: [
            { card: "BT10-090", as: "zenjiroCard" },
            { card: "BT10-049", as: "fromHand" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("zenjiroCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const choice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "BT10-090",
      options: {
        candidateInstanceIds: expect.arrayContaining([s.inst("fromHand").instanceId, s.inst("underTamer").instanceId]),
        min: 1,
        max: 1,
      },
    });
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).not.toContain(s.inst("underDigimon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("underTamer").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("underTamer").instanceId) &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("zenjiroCard").instanceId),
    );
    const zenjiro = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT10-090")!;
    await settle(() => zenjiro.isSuspended && s.state.memory === 1);

    expect(s.perm("taiki").stack).toHaveLength(0);
    expect(s.perm("xrosHeartDigimon").stack.map(({ instanceId }) => instanceId)).toContain(
      s.inst("underDigimon").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("fromHand").instanceId);
    assertNoLoudGap(s);
  });

  it("cannot gain memory from a later Xros Heart play while already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-090", as: "zenjiro", suspended: true }],
          hand: [{ card: "BT10-049", as: "ballistamon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ballistamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT10-049"));
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.decisions).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
