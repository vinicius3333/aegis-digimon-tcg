import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-063.js";

describe("EX7-063", () => {
  it("gains 1 memory when the opponent has a Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    }));
  it("plays a level 3 Puppet from hand by suspending itself when one of your Puppet Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { allowTokens: true },
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, target: { count: 1 } }],
    }));
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));

  it("gains memory only when the opponent has a Digimon at the start of Main", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "EX7-063", as: "arisa" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    withOpponent.state.memory = 0;
    await advance(withOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withOpponent.perm("arisa"));
    expect(withOpponent.state.memory).toBe(1);

    const withoutOpponent = setupEngine({ 0: { battleArea: [{ card: "EX7-063", as: "arisa" }] } });
    withoutOpponent.state.memory = 0;
    await advance(withoutOpponent.engine).fire(EffectTiming.StartOfYourMainPhase, withoutOpponent.perm("arisa"));
    expect(withoutOpponent.state.memory).toBe(0);
  });

  it("suspends itself and plays a level-3 Puppet when an own Puppet is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "BT11-035", as: "puppet" },
          ],
          hand: [{ card: "BT13-035", as: "replacement" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("puppet").permanentId], "byEffect");
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("replacement").instanceId,
      ),
    ).toBe(true);
  });

  it("does not respond to deletion of a non-Puppet Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-063", as: "arisa" },
            { card: "BT1-009", as: "ordinary" },
          ],
          hand: [{ card: "BT13-035", as: "replacement" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("ordinary").permanentId], "byEffect");
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("replacement").instanceId);
  });

  it("plays itself when revealed as a Security card", async () => {
    const s = setupEngine({ 0: { security: [{ card: "EX7-063", as: "arisa" }] } }, { autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("arisa"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("arisa").instanceId),
    ).toBe(true);
  });
});
