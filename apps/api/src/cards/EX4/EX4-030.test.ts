import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../BT1/BT1-036.js";
import "../BT1/BT1-102.js";
import "./EX4-030.js";

describe("EX4-030 Kuzuhamon", () => {
  it("registers full residual-free IR", () => {
    expect(getEffectModule("EX4-030")).toBeDefined();
    expect(runtimeCompiledCard("EX4-030")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses one optional hand Option costing 5 or less when digivolving", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { kind: ["Option"], playCostLte: 5 },
      payCost: false,
      from: ["hand"],
      optional: true,
    });
  });

  it("fires the once-per-turn cost-2 watcher and plays an eligible stack Digimon", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOptionUsed" }],
    });
    expect(irNode(effect?.actions?.[0])?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      payCost: false,
      optional: true,
    });
  });

  it("uses a qualifying Option for free after a public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "digivolutionDraw" }, { card: "BT1-010", as: "optionDraw" }, "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("optionDraw").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("digivolutionDraw").instanceId, s.inst("optionDraw").instanceId]),
    );
    expect(observe(s.engine).grantedNames(s.perm("kuzuhamon"))).toContain("sakuyamon");
  });

  it("uses the exact cost-five Option boundary without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-106", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(0);
  });

  it("does not use a cost-six Option during digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-107", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-030");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(optionId);
  });

  it("plays an exact Taomon name from the stack after the Option watcher fires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "host", under: ["BT10-039"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT10-039"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT10-039")).toBe(true);
  });

  it("plays an eligible digivolution card from a stack after a real cost-two Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "host", under: ["BT1-036"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "optionOnDigivolve" },
            { card: "BT1-102", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX4-030");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-036"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-036")).toBe(true);
  });
});
