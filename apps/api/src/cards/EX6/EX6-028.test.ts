import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-028.js";
import "../BT1/BT1-060.js";

describe("EX6-028 Seraphimon", () => {
  it("has Blast Digivolve and Recovery +1 on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving")
        .every((entry) => entry.keywords?.[0]?.keyword === "Recovery"),
    ).toBe(true);
  });
  it("returns an opposing Digimon based on your security additions once per turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAddSecurity",
      fireCondition: { kind: "triggerSecurityIsYours" },
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            filter: {
              controller: "opponent",
              levelComparison: { op: "lte", value: 0, scaling: { unit: "security", per: 1 } },
            },
          },
        },
      ],
    }));
  it("publicly recovers one card from the deck on play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX6-028", as: "sera" }],
        deck: [{ card: "BT1-001", as: "recovery" }],
        security: ["BT1-002"],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sera"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("publicly returns an opposing low-level Digimon when your security increases", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-028", as: "sera" }],
          deck: [{ card: "BT1-001", as: "recovery" }],
          security: ["BT1-002", "BT1-003", "BT1-004"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sera"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not return an opposing Digimon above the security-count level boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-028", as: "sera" }],
          deck: [{ card: "BT1-001", as: "recovery" }],
          security: ["BT1-002", "BT1-003", "BT1-004"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sera"));
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("opponent").instanceId),
    ).toBe(true);
  });

  it("does not react to an opponent's security increase and resolves only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-028", as: "sera" }],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "opponentRecovery" },
            { card: "BT1-009", as: "targetA" },
            { card: "BT1-009", as: "targetB" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("opponentRecovery"));
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sera"));
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sera"));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});
