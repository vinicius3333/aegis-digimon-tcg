import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-068.js";
import "../index.js";

describe("EX7-068 Wonder Stomp", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-068")).toMatchObject({
      cardId: "EX7-068",
      nameEn: "Wonder Stomp",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 2,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-068")).toBe(true);
  });
  it("draws 1 and may play a level 3 Puppet Digimon from hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1 } },
    ]));
  it("activates its Main effect from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" }));

  it("draws one card and plays a level-3 Puppet from hand through the public Main use", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-068", as: "wonder" },
            { card: "BT11-035", as: "puppet" },
          ],
          battleArea: [{ card: "BT1-045" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wonder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    ).toBe(true);
  });

  it("keeps the Puppet in hand when the optional play is declined after drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-068", as: "wonder" },
            { card: "BT11-035", as: "puppet" },
          ],
          battleArea: [{ card: "BT1-045" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wonder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("puppet").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("puppet").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it.each([
    ["BT13-039", "level-4 Puppet"],
    ["BT1-009", "level-3 non-Puppet"],
  ])("draws but does not play a %s (%s)", async (candidate) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-068", as: "wonder" },
            { card: candidate, as: "candidate" },
          ],
          battleArea: [{ card: "BT1-045" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wonder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("draws and plays the Puppet when a real Security check activates its Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX7-068", as: "wonder" }, "BT1-009"],
          hand: [{ card: "BT11-035", as: "puppet" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("puppet").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
