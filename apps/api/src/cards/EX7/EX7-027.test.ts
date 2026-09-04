import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-027.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-027", () => {
  it("has Puppet Overclock and plays a level 3 Puppet from hand when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords?.[0]).toMatchObject({
      keyword: "Overclock",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { count: 1 },
    });
  });
  it("inherits a once-per-turn leave-play replacement", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              cost: { kind: "deleteOwn", target: { filter: { allowTokens: true } } },
            },
          ],
        },
      ],
    }));

  it("uses the errata-mandated mandatory Overclock attack", () => {
    const attack = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0];
    expect(attack).toMatchObject({
      kind: "Attack",
      attackPlayer: true,
      withoutSuspending: true,
      cost: { kind: "deleteOwn", target: { filter: { allowTokens: true } } },
    });
    expect(attack).not.toHaveProperty("optional");
  });

  it("plays a level 3 Puppet from hand when digivolving", async () => {
    const s = setupEngine(
      { 0: { hand: ["EX7-024"], battleArea: [{ card: "EX7-027", as: "chap" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("chap"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-024"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-024")).toBe(true);
  });

  it("prevents a non-effect departure by deleting another Puppet", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-024", as: "host", under: ["EX7-027"] },
            { card: "EX7-024", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const costId = s.perm("cost").permanentId;
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byBattle")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === costId)).toBe(false);
  });
});
