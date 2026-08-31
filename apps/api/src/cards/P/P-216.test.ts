import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-216.js";

describe("P-216 WaruMonzaemon", () => {
  it("has Blocker on the card and as an inherited keyword", () => {
    expect(
      runtimeCompiledCard("P-216")!
        .effects.filter((effect) => effect.trigger === "Static")
        .map((effect) => effect.keywords),
    ).toEqual([[{ keyword: "Blocker", raw: "＜Blocker＞" }], [{ keyword: "Blocker", raw: "＜Blocker＞" }]]);
  });

  it("plays a Dark Masters Digimon from hand and restricts that played card until opponent turn end", () => {
    expect(runtimeCompiledCard("P-216")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }],
            },
          },
        },
        { kind: "Restrict", target: { sameTarget: true }, restriction: "digivolve", duration: "permanent" },
        { kind: "DelayedDeletePlayed", timing: "endOfOpponentTurn" },
      ],
    });
  });

  it("plays a face-up Dark Masters Digimon from security and deletes it at your turn end", () => {
    expect(runtimeCompiledCard("P-216")!.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }],
            },
          },
        },
        { kind: "Restrict", target: { sameTarget: true }, restriction: "digivolve", duration: "permanent" },
        { kind: "DelayedDeletePlayed", timing: "endOfOwnerTurn" },
      ],
    });
  });
});
describe("P-216 engine behavior", () => {
  it("plays a Dark Masters Digimon from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-216", as: "waru" },
            { card: "BT15-031", as: "masters" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("waru").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("masters").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("masters").instanceId)).toBe(
      true,
    );
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("masters").instanceId)!;
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === played.permanentId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === played.permanentId)).toBe(false);
  });

  it("plays a face-up Dark Masters Digimon from Security on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-216", as: "waru" }], security: [{ card: "BT15-031", as: "masters" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("waru").permanentId]);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("masters").instanceId)).toBe(
      true,
    );
  });

  it("deletes the security-played Dark Masters Digimon at its owner's turn end", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-216", as: "waru" }], security: [{ card: "BT15-031", as: "masters" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("waru").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("masters").instanceId),
    );
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("masters").instanceId)!;
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);

    s.state.turnSeat = 0;
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === played.permanentId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === played.permanentId)).toBe(false);
  });
});
