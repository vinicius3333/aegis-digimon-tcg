import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-003.js";

describe("BT20-003 Bibimon", () => {
  it("proves the inherited end-of-turn placement is optional and once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      target: { count: 1 },
      targetIsPermanent: true,
      position: "bottom",
      underFilter: { kind: ["Digimon"], isSelfRef: true, digivolutionStackKindExclude: ["Tamer"] },
    });
  });

  it("places a qualifying field Tamer at this Digimon's bottom only when its stack has no Tamer", async () => {
    const eligible = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-089", as: "socTamer" },
            { card: "BT20-085", as: "nonMatching" },
          ],
          breeding: { card: "BT20-003", as: "evolvingHost" },
          hand: [{ card: "BT10-031", as: "yellowRookie" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    // Evolve Bibimon into a legal yellow Rookie in the initial Main fixture, then move it
    // publicly during the next real Breeding phase before reaching End of Your Turn.
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("evolvingHost").permanentId,
        instanceId: eligible.inst("yellowRookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("evolvingHost").topCard.cardId === "BT10-031");
    expect(eligible.perm("evolvingHost").topCard.cardId).toBe("BT10-031");
    const eligibleTurn = eligible.engine.runOneTurn();
    await settle(() => eligible.state.phase === Phase.Breeding);
    expect(eligible.state.phase).toBe(Phase.Breeding);
    expect(
      eligible.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: eligible.perm("evolvingHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await advance(eligible.engine).waitForMainPhase(0);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;
    expect(eligible.perm("evolvingHost").stack.map((card) => card.cardId)).toEqual(["BT20-089", "BT20-003"]);
    expect(eligible.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-089")).toBe(
      false,
    );

    const blocked = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "blockedHost", under: ["BT20-003", "BT1-085"] },
            { card: "BT17-086", as: "eligibleTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(blocked.engine).runTurn(0);
    expect(blocked.perm("blockedHost").stack.map((card) => card.cardId)).toEqual(["BT20-003", "BT1-085"]);
    expect(blocked.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-086")).toBe(
      true,
    );

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "declinedHost", under: ["BT20-003"] },
            { card: "BT20-089", as: "declinedTamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).runTurn(0);
    expect(declined.perm("declinedHost").stack.map((card) => card.cardId)).toEqual(["BT20-003"]);
    expect(declined.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-089")).toBe(
      true,
    );
  });

  it.each([
    ["BT14-087", "Eiji Nagasumi (SoC-only)"],
    ["BT17-086", "Leon Alexander (Pulsemon text)"],
    ["BT24-086", "The Crossroad Witch (SEEKERS-only)"],
  ] as const)("selects the %s text route from a mixed field (%s)", async (matchingCard, _label) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-031", as: "host", under: ["BT20-003"] },
            { card: matchingCard, as: "matching" },
            { card: "BT20-085", as: "nonMatching" },
          ],
        },
        1: { battleArea: [{ card: matchingCard, as: "opponentMatching" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("host").stack.some((card) => card.cardId === matchingCard));
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([matchingCard, "BT20-003"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-085")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === matchingCard)).toBe(true);
  });
});
