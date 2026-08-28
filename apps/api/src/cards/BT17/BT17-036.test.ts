import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-036.js";

describe("BT17-036 Boutmon", () => {
  it("once per turn prevents opponent-effect removal by trashing security", () => {
    expect(
      compiled.effects.find((entry) => entry.frequency === "OncePerTurn" && entry.actions[0]?.kind === "Replacement"),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
  });

  it("evolves into a Pulsemon-text Digimon after effect-removing a security card when Leon is underneath", () => {
    expect(compiled.effects.find((entry) => entry.actions[0]?.kind === "SubTrigger")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenEffectTrashesFromSecurity",
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            },
          ],
        },
      ],
    });
  });

  it("may trash security to unsuspend after attacking when its top card has Pulsemon in its text", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          condition: { kind: "selfTopHasText" },
          cost: { kind: "trashSecurityTop" },
          optional: true,
        },
      ],
    });
  });

  it("naturally digivolves for free when its inherited attack effect trashes security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-036", under: ["BT17-086"], as: "boutmon" }],
          hand: [{ card: "BT16-047", as: "pulsemonText" }],
          security: 1,
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const boutmonId = s.perm("boutmon").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: boutmonId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT16-047");

    expect(s.perm("boutmon").topCard.cardId).toBe("BT16-047");
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
