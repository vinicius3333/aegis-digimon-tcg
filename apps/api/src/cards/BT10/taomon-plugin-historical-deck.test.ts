import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../EX2/EX2-019.js";
import "../EX2/EX2-021.js";
import "../EX2/EX2-066.js";
import "./BT10-039.js";
import "./BT10-105.js";

describe("BT10/EX2 Taomon Plug-In deck gauntlet", () => {
  it("offers only Plug-Ins in the UI, uses one free, resolves both inherited effects, and checks twice", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-021", as: "kyubimon", under: [{ card: "EX2-019", as: "renamon" }] },
          ],
          hand: [
            { card: "BT10-039", as: "taomon" },
            { card: "EX2-066", as: "offensivePlugin" },
            { card: "BT10-105", as: "defensePlugin" },
            { card: "BT4-111", as: "unrelatedOption" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "dpTarget", dp: 5000 }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredIds,
      },
    );
    preferredIds.push(
      s.inst("offensivePlugin").instanceId,
      s.perm("kyubimon").permanentId,
      s.perm("dpTarget").permanentId,
    );
    const taomonPermanentId = s.perm("kyubimon").permanentId;
    const offensivePluginId = s.inst("offensivePlugin").instanceId;
    const defensePluginId = s.inst("defensePlugin").instanceId;
    const unrelatedOptionId = s.inst("unrelatedOption").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: taomonPermanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === offensivePluginId) &&
      s.perm("dpTarget").currentDP === 3000
    );

    const optionChoice = s.decisions.find(({ req }) =>
      req.kind === "selectCards" &&
      req.options?.candidateInstanceIds?.includes(offensivePluginId)
    )?.req;
    expect(new Set(optionChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([offensivePluginId, defensePluginId]),
    );
    expect(optionChoice?.options?.candidateInstanceIds).not.toContain(unrelatedOptionId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("dpTarget").currentDP).toBe(3000);
    expect(observe(s.engine).keywordAmount(s.perm("kyubimon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === defensePluginId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === unrelatedOptionId)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: taomonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
