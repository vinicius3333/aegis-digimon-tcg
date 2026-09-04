import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-027.js";

describe("EX8-027", () => {
  it("plays a level 4 or lower Digimon from its digivolution cards when digivolving", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromOwnDigivolutionStack: true,
      payCost: false,
      optional: true,
      target: { count: 1 },
    }));
  it("can DNA digivolve into DS and attack after another DS Digimon is played or digivolves", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [{ kind: "DnaDigivolve" }, { kind: "Attack", optional: true }],
    });
    expect(actions[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
  });
  it("registers the live Plesiomon permanent with its DS trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-027", as: "plesiomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plesiomon"), "DS")).toBe(true);
  });

  it("plays one level-4-or-lower card only from its own stack when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-025", as: "whamon", under: [{ card: "EX8-020", as: "own" }] },
            { card: "BT8-030", as: "other", under: [{ card: "EX8-025", as: "foreign" }] },
          ],
          hand: [{ card: "EX8-027", as: "plesiomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("whamon").permanentId,
        instanceId: s.inst("plesiomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("own").instanceId),
    );

    expect(s.perm("other").stack.some((card) => card.instanceId === s.inst("foreign").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("keeps the optional source playback declined during digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-025", as: "whamon", under: [{ card: "EX8-020", as: "own" }] }],
          hand: [{ card: "EX8-027", as: "plesiomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("whamon").permanentId,
        instanceId: s.inst("plesiomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("whamon").topCard.cardId === "EX8-027");

    expect(s.perm("whamon").stack).toHaveLength(2);
    expect(s.perm("whamon").topCard.cardId).toBe("EX8-027");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("triggers from Plesiomon's own play, DNA digivolves into DS, and attacks (Q3894)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-026", as: "metal" }],
          hand: [
            { card: "EX8-027", as: "plesiomon" },
            { card: "EX8-029", as: "aegis" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plesiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("aegis").instanceId),
    ).toBe(true);
  });

  it("triggers from Plesiomon's own digivolution and exposes the exact DS route (Q3895)", async () => {
    expect(digivolutionRequirementsFor("EX8-027")).toContainEqual({
      level: 5,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-025", as: "whamon" },
            { card: "EX8-026", as: "metal" },
          ],
          hand: [
            { card: "EX8-027", as: "plesiomon" },
            { card: "EX8-029", as: "aegis" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("whamon").permanentId,
        instanceId: s.inst("plesiomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("aegis").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
