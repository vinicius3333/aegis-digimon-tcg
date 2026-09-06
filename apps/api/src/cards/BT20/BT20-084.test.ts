import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT6/BT6-084.js";
import { compiled } from "./BT20-084.js";
import "./index.js";

describe("BT20-084 Sistermon Ciel (Awakened)", () => {
  it("has a trash-only effect that may digivolve a Sistermon Ciel into this card when a Digimon is played", () => {
    expect(compiled.effects.find((effect) => effect.isFromTrash)).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Digivolve",
              from: ["trash"],
              payCost: false,
              ignoreRequirements: true,
              into: { cardId: "BT20-084", controller: "mine", kind: ["Digimon"], zone: "trash" },
            },
          ],
        },
      ],
    });
  });

  it("prevents one opposing Digimon or Tamer from suspending on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("places this Digimon's top digivolution card on top of security at end of all turns", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          fromDigivolutionTop: true,
          toTop: true,
          source: { isSelf: true },
        },
      ],
    });
  });

  it("naturally digivolves a Sistermon Ciel from trash when one of your Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-084", as: "ciel" }],
          hand: [{ card: "BT20-047", as: "played" }],
          trash: [{ card: "BT20-084", as: "awakened" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ciel").topCard.cardId === "BT20-084");

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("awakened").instanceId);
    expect(s.perm("ciel").topCard.cardId).toBe("BT20-084");
  });

  it("moves its top stack card to the top of security at End of All Turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-084", under: [{ card: "BT20-047", as: "stackTop" }], as: "awakened" }],
        security: ["BT1-001"],
      },
    });
    await s.ready();
    await advance(s.engine).fireGlobal(EffectTiming.EndOfAllTurns);
    await settle(() => s.state.players[0]!.security[0]?.instanceId === s.inst("stackTop").instanceId);

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("stackTop").instanceId);
    expect(s.perm("awakened").stack).toHaveLength(0);
  });

  it("locks one opposing Digimon for both public entry routes until opponent turn end", async () => {
    for (const route of ["play", "evolve"] as const) {
      const s =
        route === "play"
          ? setupEngine(
              {
                0: { hand: [{ card: "BT20-084", as: "awakened" }] },
                1: { battleArea: [{ card: "BT20-010", as: "target" }] },
              },
              { autoAcceptOptional: true, autoSelectCards: true },
            )
          : setupEngine(
              {
                0: { battleArea: [{ card: "BT6-084", as: "ciel" }], hand: [{ card: "BT20-084", as: "awakened" }] },
                1: { battleArea: [{ card: "BT20-010", as: "target" }] },
              },
              { autoAcceptOptional: true, autoSelectCards: true },
            );
      s.state.memory = route === "play" ? 5 : 1;
      const result =
        route === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("awakened").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("ciel").permanentId,
              instanceId: s.inst("awakened").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some(
            (event) =>
              event.kind === "effectResolved" &&
              event.sourceCardId === "BT20-084" &&
              (event.timing === "OnPlay" || event.timing === "WhenDigivolving"),
          ) && s.state.pendingDecision === undefined,
      );
      await advance(s.engine).verb.suspend([s.perm("target").permanentId], 0);
      expect(s.perm("target").isSuspended).toBe(false);
    }
  });
});
