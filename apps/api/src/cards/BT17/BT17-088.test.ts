import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-088.js";
import "./index.js";

describe("BT17-088 Willis", () => {
  it("boosts one green Digimon on play and at the start of the owner's main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd", target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Green"] }, count: 1 } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" }] });
  });

  it("reacts to a played Terriermon or Lopmon by suspending this Tamer and reducing a free target's evolution cost", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }] },
      actions: [{
        kind: "Digivolve",
        from: ["hand"],
        reduceCost: 2,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "suspend", target: { isSelf: true } },
        target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }] } },
      }],
    });
  });

  it("allows the digivolve target to be any hand Digimon, not necessarily the played one", () => {
    expect(compiled.effects?.[2]?.actions?.[0]?.actions?.[0]).toMatchObject({ into: { kind: ["Digimon"] } });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });

  it("suspends Willis and evolves a played Terriermon with the reduced cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-088", as: "willis" }],
        hand: [{ card: "BT17-043", as: "terriermon" }, { card: "BT17-049", as: "antylamon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    const antylamonId = s.inst("antylamon").instanceId;

    expect(s.engine.applyIntent(0, { type: "play", instanceId: s.inst("terriermon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === antylamonId));

    expect(s.perm("willis").isSuspended).toBe(true);
    expect(s.state.memory).toBe(6);
  });
});
