import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_013 } from "./BT25-013.js";
import "../index.js";

describe("BT25-013 Firamon", () => {
  it("trashes one hand card to optionally return a red/blue Iliad Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_013.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        abortOnDecline: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Red", "Blue"],
            nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
          },
          count: 1,
        },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      });
    }
  });

  it("uses a structured blue trigger gate for the Flaremon option", () => {
    const effect = BT25_013.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"] as const) {
      const watcher = effect?.actions?.find((action) => action.kind === "SubTrigger" && action.event === event);
      expect(watcher).toMatchObject({
        fireCondition: { kind: "triggerSubjectHasColor", filter: { colors: ["Blue"] } },
      });
      const subTrigger = watcher as { actions?: unknown[] } | undefined;
      expect(subTrigger?.actions?.[0]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        reduceCost: 1,
        payCost: true,
        optional: true,
      });
    }
  });

  it("keeps inherited +2000 DP during your turn", () => {
    expect(BT25_013.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it.each(["OnPlay", "WhenDigivolving"] as const)(
    "trashes one hand card and may return one red/blue Iliad Digimon on %s",
    async (trigger) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT25-013", as: "firamon" }],
            hand: [{ card: "BT1-010", as: "cost" }],
            trash: [
              { card: "BT25-012", as: "returned" },
              { card: "BT25-021", as: "wrongTrait" },
              { card: "BT25-004", as: "wrongColor" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(
        trigger === "OnPlay" ? EffectTiming.OnPlay : EffectTiming.WhenDigivolving,
        s.perm("firamon"),
      );
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returned").instanceId));

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("returned").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("returned").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongTrait").instanceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongColor").instanceId);
    },
  );

  it("allows paying the trash cost and declining the return choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-013", as: "firamon" }],
          hand: [{ card: "BT1-010", as: "cost" }],
          trash: [{ card: "BT25-012", as: "returned" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("firamon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const costDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const returnDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("returned").instanceId);
  });

  it("evolves into Flaremon only for a blue event and pays its cost reduced by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-013", as: "firamon" }],
          hand: [
            { card: "BT25-017", as: "flaremon" },
            { card: "BT25-021", as: "blue" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("firamon").topCard.instanceId === s.inst("flaremon").instanceId);

    expect(s.perm("firamon").topCard.cardId).toBe("BT25-017");
    expect(s.state.memory).toBe(0);
  });

  it("does not offer Flaremon for a non-blue event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-013", as: "firamon" }],
          hand: [{ card: "BT25-017", as: "flaremon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("firamon").permanentId });

    expect(s.perm("firamon").topCard.cardId).toBe("BT25-013");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("flaremon").instanceId);
  });

  it("supports the red/blue and alternate TS evolution requirements and inherited DP", async () => {
    expect(getCardDefinition("BT25-013")).toMatchObject({
      colors: ["Red"],
      level: 4,
      playCost: 4,
      dp: 5000,
      types: ["Beast", "Iliad", "TS"],
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 2 },
        { color: "Blue", level: 3, memoryCost: 2 },
      ],
    });
    expect(digivolutionRequirementsFor("BT25-013")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });

    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-022", as: "base" }], hand: [{ card: "BT25-013", as: "firamon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("firamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("firamon").instanceId);
    expect(s.state.memory).toBe(0);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT1-010", dp: 3000, under: ["BT25-013"], as: "host" }] },
    });
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(5000);
    inherited.state.turnSeat = 1;
    await advance(inherited.engine).recompute();
    expect(inherited.perm("host").currentDP).toBe(3000);
  });
});
