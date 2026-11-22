import { EffectTiming } from "@aegis/shared/schema/enums";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, setupEngine, settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/BT27/BT27-010";
import "#api/cards/BT27/BT27-007";
import "#api/cards/BT27/BT27-012";
import "#api/cards/BT22/BT22-078";
import "#api/cards/BT22/BT22-092";

function activateMain(s: ReturnType<typeof setupEngine>) {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.inst("host").instanceId,
    effectKey: `BT27-010/ir-${EffectTiming.OnDeclaration}-0`,
  });
}

describe("Meramon paid deletion activation", () => {
  it.each([5999, 6000, 6001])("pays one memory and observes the 6000 DP boundary at %s", async (dp) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-010", as: "host" }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", dp }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(activateMain(s).ok).toBe(true);
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT27-010") &&
        !s.state.pendingDecision,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(dp <= 6000 ? 0 : 1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(activateMain(s).ok).toBe(false);
    assertNoLoudGap(s);
  });

  it("declines without paying memory or deleting", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT27-010", as: "host" }] }, 1: { battleArea: ["BT1-019"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(activateMain(s).ok).toBe(true);
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional") && !s.state.pendingDecision);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(activateMain(s).ok).toBe(true);
  });

  it("deletes through its main and inherited effects when the host is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-010", as: "host", under: ["BT27-007"] }] },
        1: { battleArea: ["BT1-019", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT27-010", "BT27-007"]),
    );
    assertNoLoudGap(s);
  });
});

describe("official rulings", () => {
  async function digivolveWithJimmy(payMeramonCost: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT22-092", as: "jimmy" },
          ],
          hand: [{ card: "BT27-010", as: "meramon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    for (;;) {
      await settle(() => s.state.pendingDecision?.kind === "optional" || s.state.pendingDecision === undefined);
      const decision = s.state.pendingDecision;
      if (decision === undefined) break;
      const source = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)?.req.sourceCardId;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept: payMeramonCost || source !== "BT27-010" },
        }),
      ).toEqual({ ok: true });
    }
    return s;
  }

  it("gains Jimmy KEN's memory when Meramon's Main effect paid its cost", async () => {
    const s = await digivolveWithJimmy(true);
    expect(s.perm("jimmy").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(5 - 2 - 1 + 1);
  });

  it("does not gain Jimmy KEN's memory when Meramon's Main effect did not pay its cost", async () => {
    const s = await digivolveWithJimmy(false);
    expect(s.perm("jimmy").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(5 - 2);
  });

  it("activates an On Deletion effect gained from its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-010", as: "host", under: ["BT27-012"] }] },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: [{ card: "BT1-009", as: "securityTop" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 5;
    await s.ready();
    expect(activateMain(s).ok).toBe(true);
    await settle(() => s.state.players[1]!.security.length === 1 && !s.state.pendingDecision);
    expect(s.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("securityTop").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(4);
  });

  it("lets Boltmon activate only Meramon's inherited On Deletion effect through the gained Main effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-078", as: "boltmon", under: [{ card: "BT27-010", as: "meramon" }] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const gainedMain = (
      observe(s.engine).activatableEffects(s.perm("boltmon")) as { instanceId: string; effectKey: string }[]
    ).find((entry) => entry.instanceId === s.inst("meramon").instanceId);
    expect(gainedMain).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("meramon").instanceId,
        effectKey: gainedMain!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.state.pendingDecision);
    expect(s.decisions.some(({ req }) => req.kind === "chooseOption")).toBe(false);
    expect(s.state.memory).toBe(4);
  });
});
