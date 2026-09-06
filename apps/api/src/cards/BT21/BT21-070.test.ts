import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-070.js";
import "../index.js";
describe("BT21-070 Gossipmon", () => {
  it("preserves the Appmon link requirement and linked recovery", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              },
              count: 1,
            },
            to: "hand",
            optional: true,
          },
        ],
      }),
    );
  });

  it("plays from security and recovers Appmon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityBattleEnded",
            once: true,
            actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
          }),
        ],
      }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toHaveLength(2);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ]);
    }
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("returns an Appmon from trash through its public On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-070", as: "gossipmon" }],
          trash: [{ card: "BT21-041", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gossipmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("appmon").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("appmon").instanceId)).toBe(false);
  });

  it("links to an Appmon for 2 and recovers an Appmon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-041", as: "host" }],
          hand: [{ card: "BT21-070", as: "gossipmon" }],
          trash: [{ card: "BT21-005", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("gossipmon").instanceId)).toBe(true);
  });

  it("recovers through the When Digivolving branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }],
          hand: [{ card: "BT21-070", as: "gossipmon" }],
          trash: [{ card: "BT21-005", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gossipmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("recovered").instanceId));

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("gossipmon").instanceId);
  });

  it("does not recover a non-Appmon Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-070", as: "gossipmon" }],
          trash: [{ card: "BT1-009", as: "other" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("gossipmon"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-070", as: "gossipmon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("gossipmon").instanceId),
    );
    expect(s.state.memory).toBe(0);
    const checked = s.events.findIndex(
      (event) => event.kind === "securityChecked" && event.revealedCardId === "BT21-070",
    );
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-070");
    expect(checked).toBeGreaterThanOrEqual(0);
    expect(played).toBeGreaterThan(checked);
  });
});
