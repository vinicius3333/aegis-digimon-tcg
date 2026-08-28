import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-043.js";
import "./index.js";

describe("BT17-043 Terriermon", () => {
  it("triggers once per turn from Terriermon/Lopmon or any green Tamer played by an effect", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect!.actions[0]).toMatchObject({
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        byEffect: true,
        orFilters: [
          { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }] },
          { kind: ["Tamer"], colors: ["Green"] },
        ],
      },
    });
  });

  it("gains 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });

  it("suspends an opponent only when an effect plays the qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-043", as: "terriermon" },
            { card: "EX4-025", as: "turuiemon" },
          ],
          trash: [{ card: "BT17-043", as: "playedTerriermon" }],
          hand: [{ card: "BT17-049", as: "antylamon" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("playedTerriermon").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-043")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("grants inherited DP only while the host is suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-046", dp: 6000, under: ["BT17-043"], as: "host" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").currentDP).toBe(7000);
  });
});
