import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-015.js";

describe("BT17-015", () => {
  it("reduces its play cost by 3 when you have a Tai Kamiya Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 3, condition: { kind: "youHave" } }],
        },
      ],
    });
  });

  it("offers deletion or free MetalGarurumon digivolution on play and digivolution", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "Delete" }],
          [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
              optional: true,
              allowNoTarget: true,
              target: { filter: { kind: ["Digimon"] } },
              into: { kind: ["Digimon"] },
            },
          ],
        ],
      });
    }
  });

  it("reduces the natural play cost with Tai Kamiya and deletes an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-015", as: "warGreymon" }],
          battleArea: [{ card: "BT1-085", as: "tai" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-015"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("naturally free-digivolves a Gabumon into MetalGarurumon through the second modal branch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-015", as: "warGreymon" },
            { card: "BT1-044", as: "metalGarurumon" },
          ],
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gabumon").topCard.cardId === "BT1-044");

    expect(s.perm("gabumon").stack.map(({ cardId }) => cardId)).toContain("BT1-029");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("BT1-044");
    expect(s.state.memory).toBe(0);
  });

  it("allows the optional Gabumon branch to end without a target (Q2743)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT17-015", as: "warGreymon" }] } },
      { autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-015"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("trashes opponent security as inherited when it has Omnimon in its name", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "selfHasNameContaining" },
        },
      ],
    });
  });

  it("trashes one security card when an Omnimon host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-078", as: "host", under: ["BT17-015"] }] },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    // The inherited effect trashes one card, then the attack's normal check removes the
    // remaining security card.
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
