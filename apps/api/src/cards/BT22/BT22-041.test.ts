import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-041.js";
import "./index.js";

describe("BT22-041 Kentaurosmon", () => {
  it("gates the play-cost reduction on total security, places a yellow hand card on top, and trashes top security to unsuspend", () => {
    const reduction = compiled.effects.find(
      (entry) => entry.trigger === "Static" && entry.actions[0]?.kind === "Replacement",
    );
    expect(reduction?.actions[0]).toMatchObject({
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      mode: "reduceCost",
      amount: 6,
      condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        from: ["hand"],
        source: { filter: { controllerDefault: "mine", colors: ["Yellow"] }, count: 1 },
        toTop: true,
        optional: true,
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Unsuspend",
              cost: {
                kind: "trash",
                target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
              },
            },
          ],
        },
      ],
    });
  });

  it("digivolves for 3 and places a yellow hand card on top of security", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001", "BT1-002", "BT1-003"],
          battleArea: [{ card: "BT22-037", as: "chirinmon" }],
          hand: [
            { card: "BT22-041", as: "kentaurosmon" },
            { card: "BT22-029", as: "yellow" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chirinmon").permanentId,
        instanceId: s.inst("kentaurosmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT22-029"));
    await settle();

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-041")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("reduces its play cost only at the six-total-security boundary", async () => {
    for (const [securityCount, expectedMemory] of [
      [6, 4],
      [7, -2],
    ] as const) {
      const ownSecurity = Array.from({ length: securityCount }, () => "BT1-001");
      const s = setupEngine({
        0: { security: ownSecurity, hand: [{ card: "BT22-041", as: "kentaurosmon" }] },
      });
      await s.ready();
      s.state.memory = 10;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kentaurosmon").instanceId })).toEqual({
        ok: true,
      });
      await settle();

      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("does not reduce another card's play cost at the six-security boundary", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-041", as: "kentaurosmon" }], hand: [{ card: "BT22-043", as: "other" }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(-3);
  });

  it("trashes one top security to unsuspend, but only on the first suspension each turn", async () => {
    const s = setupEngine({
      0: {
        security: ["BT1-001", "BT1-002"],
        battleArea: [{ card: "BT22-041", as: "kentaurosmon" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("kentaurosmon").permanentId]);
    await settle(() => s.perm("kentaurosmon").isSuspended === false);
    expect(s.state.players[0]!.security).toHaveLength(1);

    await advance(s.engine).verb.suspend([s.perm("kentaurosmon").permanentId]);
    await settle();
    expect(s.perm("kentaurosmon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
