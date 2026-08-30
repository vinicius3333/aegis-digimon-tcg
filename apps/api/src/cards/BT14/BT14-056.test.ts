import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-056.js";

describe("BT14-056", () => {
  it("reveals five and adds a D-Brigade or DigiPolice card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 5,
      rest: "deckTopOrBottom",
      add: [
        { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["D-Brigade", "DigiPolice"], match: "trait" }] } },
      ],
    }));
  it("inherits once-per-turn leave-play prevention by deleting another D-Brigade Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        mode: "prevent",
        leaveCause: "otherThanYourEffect",
        actions: [{ kind: "Prevent", cost: { kind: "deleteOwn" } }],
      }],
    }));

  it("naturally plays the matching D-Brigade card from the top-five reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-056", as: "commandramon" }],
          deck: ["BT14-060", "AD1-001", "AD1-002", "AD1-003", "AD1-004"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("commandramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-060"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-060")).toBe(true);
  });

  it("naturally replaces a battle deletion only by deleting another D-Brigade Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "host", dp: 2000, suspended: true, under: ["BT14-056"] },
            { card: "BT14-056", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
      !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
  });
});
