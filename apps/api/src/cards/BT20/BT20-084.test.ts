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

  it("matches plain Sistermon Ciel but not already Awakened Sistermon Ciel", async () => {
    for (const target of ["plain", "awakened"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: target === "plain" ? "BT6-084" : "BT20-084", as: "target" }],
            hand: [{ card: "BT20-047", as: "played" }],
            trash: [{ card: "BT20-084", as: "awakened" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 7;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.perm("target").topCard.cardId).toBe("BT20-084");
      expect(s.perm("target").stack).toHaveLength(target === "plain" ? 1 : 0);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("awakened").instanceId)).toBe(
        target === "awakened",
      );
    }
  });

  it("can refuse the optional trash evolution while leaving the plain Ciel and source in place", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-084", as: "target" }],
          hand: [{ card: "BT20-047", as: "played" }],
          trash: [{ card: "BT20-084", as: "awakened" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("target").topCard.cardId).toBe("BT6-084");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("awakened").instanceId);
  });

  it("does not trigger the trash effect when a Tamer is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-084", as: "target" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
          trash: [{ card: "BT20-084", as: "awakened" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-085"));
    expect(s.perm("target").topCard.cardId).toBe("BT6-084");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("awakened").instanceId);
  });

  it("resolves plain Ciel On Play and the trash reaction in either order without re-triggering", async () => {
    for (const first of ["plain", "trash"] as const) {
      const s = setupEngine(
        {
          0: { hand: [{ card: "BT6-084", as: "played" }], trash: [{ card: "BT20-084", as: "awakened" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      s.state.memory = 7;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
      const key = request.options!.triggerKeys!.find((candidate) =>
        candidate.includes(s.inst(first === "plain" ? "played" : "awakened").instanceId),
      );
      expect(key).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "orderTriggers", order: [key!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT20-084");
      expect(s.state.memory).toBe(first === "plain" ? 4 : 3);
    }
  });

  it("moves its top stack card to the top of security at End of All Turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-084", under: [{ card: "BT20-047", as: "stackTop" }], as: "awakened" }],
        security: ["BT1-001"],
      },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
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
