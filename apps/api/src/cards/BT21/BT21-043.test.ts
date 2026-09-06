import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT21-043.js";
import "../index.js";

describe("BT21-043 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves the Appmon link requirement and linked -2000 DP effect", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    const linking = compiled.effects.find((effect) => effect.trigger === "WhenLinking");
    expect(linking).toEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            amount: -2000,
            duration: "untilOpponentTurnEnd",
          },
        ],
      }),
    );
  });

  it("plays itself without cost at the end of the Security battle", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        isSecurity: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityBattleEnded",
            once: true,
            actions: [
              {
                kind: "PlayWithoutCost",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                from: ["trash"],
                payCost: false,
              },
            ],
          },
        ],
      }),
    );
  });

  it("applies the same -2000 DP effect on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -2000,
          duration: "untilOpponentTurnEnd",
        },
      ]);
    }
  });

  it("plays through the public intent and reduces an opponent Digimon by 2000 DP", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT21-043", as: "sociamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sociamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("links to an Appmon for 2, grants 3000 DP, and applies the linking debuff", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT21-043", as: "sociamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("sociamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.cardId === "BT21-043"));
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("plays after a real Security battle and resolves its On Play debuff", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }],
          security: [{ card: "BT21-043", as: "sociamon" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-043"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(3000);
    const checked = s.events.findIndex((event) => event.kind === "securityChecked");
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-043");
    expect(checked).toBeGreaterThanOrEqual(0);
    expect(played).toBeGreaterThan(checked);
  });

  it("expires the play and digivolution debuff at the opponent's turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-041", as: "base" }], hand: [{ card: "BT21-043", as: "sociamon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sociamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("target").currentDP).toBe(3000);
    s.give(1, Zone.Deck, "BT1-001");
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("digivolves normally and applies the same -2000 DP boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-041", as: "calendamon" }],
          hand: [{ card: "BT21-043", as: "sociamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 5000 },
            { card: "BT1-010", as: "other", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("calendamon").permanentId,
        instanceId: s.inst("sociamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calendamon").topCard.cardId === "BT21-043");

    expect(s.state.memory).toBe(1);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("other").currentDP).toBe(6000);
  });
});
