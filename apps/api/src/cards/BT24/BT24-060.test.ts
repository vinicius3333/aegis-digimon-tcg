import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_060 } from "./BT24-060.js";
import "../index.js";

describe("BT24-060 Hisyaryumon", () => {
  it("captures the printed reveal, suspension, attack, and replacement structure", () => {
    const attack = BT24_060.effects?.find((entry) => entry.trigger === "WhenAttacking");
    // The digivolve rides on the reveal as `digivolveOption` (the shape runRevealAdd consumes),
    // not as a second action: it is the same decision window as the reveal, not a later one.
    expect(attack?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckTopOrBottom",
      digivolveOption: {
        payCost: false,
        into: { nameOrTrait: [{ tokens: ["DigiPolice", "SEEKERS"], match: "trait" }] },
      },
    });
    const inherited = BT24_060.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).affectsAll).toBe(true);
  });

  it("When Attacking may digivolve into a revealed DigiPolice card without paying", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          deck: [
            { card: "BT24-064", as: "ouryumon" },
            { card: "BT1-001", as: "miss1" },
            { card: "BT1-002", as: "miss2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("hisyaryumon"));
    await settle(() => s.perm("hisyaryumon").topCard.instanceId === s.inst("ouryumon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("suspends an opponent Digimon when a Tamer is placed in its own stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          hand: [{ card: "BT15-087", as: "shuu" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("hisyaryumon").permanentId, [s.inst("shuu").instanceId]);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("Q5782: one inherited payment prevents every qualifying simultaneous departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-064", as: "host", under: ["BT24-060", "BT15-087"] },
            { card: "BT24-054", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const otherId = s.perm("other").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([hostId, otherId], "effect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === otherId)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT15-087")).toBe(false);
  });
});
