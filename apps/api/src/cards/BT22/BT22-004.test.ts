import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-004.js";
import "./index.js";

describe("BT22-004 Wanyamon", () => {
  it("hatches publicly and legally evolves into a CS Digimon while rejecting Agumon", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT22-004", as: "egg" }],
        hand: [
          { card: "BT22-043", as: "terriermon" },
          { card: "BT22-008", as: "invalidAgumon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-004");
    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("terriermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-043");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-004"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("invalidAgumon").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("requires effect provenance for its inherited stack-add watcher", () => {
    const watcher = compiled.effects[0]?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine", byEffect: true },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
    });
  });

  it("may digivolve its inherited host into a CS Digimon for 1 less after a CS card is added", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", under: ["BT22-004", "BT22-044"], as: "host" }],
          hand: [{ card: "BT22-047", as: "next" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 3;
    const added = s.perm("host").stack.find((card) => card.cardId === "BT22-044")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
      byEffectSeat: 0,
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT22-047");

    expect(s.perm("host").topCard?.cardId).toBe("BT22-047");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT22-004", "BT22-044", "BT22-043"]);
    expect(s.state.memory).toBe(2);
  });

  it("naturally rotates a CS card, triggers from effect provenance, and evolves the inherited host", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT22-004", as: "host" }],
          deck: ["BT1-001", "BT1-002"],
          hand: [
            { card: "BT22-043", as: "terriermon" },
            { card: "BT22-046", as: "gargomon" },
            { card: "BT22-047", as: "next" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-004");
    s.state.phase = Phase.Main;
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("terriermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-043");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-046");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === breedingId));
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    const host = s.perm("host");
    const terriermon = host.stack.find((card) => card.cardId === "BT22-043")!;
    const oldGargomon = host.topCard!;
    const source = (s.engine as any).cardSourceOf(terriermon);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-043/"),
    )!.effectKey;

    const activation = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: terriermon.instanceId,
      effectKey,
    });
    expect(activation).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      let answered = false;
      for (const decision of [...s.decisions].reverse()) {
        const response =
          decision.req.kind === "optional"
            ? { kind: "optional" as const, accept: true }
            : decision.req.kind === "chooseOption"
              ? { kind: "chooseOption" as const, optionIndex: 0 }
              : decision.req.kind === "orderTriggers"
                ? { kind: "orderTriggers" as const, order: (decision.req.options?.triggerKeys ?? []).slice(0, 1) }
                : undefined;
        if (response === undefined) continue;
        const result = s.engine.applyIntent(decision.seat, {
          type: "respondDecision",
          decisionId: decision.req.decisionId,
          response,
        });
        if (result.ok) {
          answered = true;
          break;
        }
      }
      if (!answered) break;
      await Promise.resolve();
    }
    await settle(() => host.topCard?.cardId === "BT22-043");
    await settle(() => host.topCard?.cardId === "BT22-047");

    expect(host.stack.map((card) => card.cardId)).toEqual(["BT22-046", "BT22-004", "BT22-043"]);
    expect(host.stack[0]!.instanceId).toBe(oldGargomon.instanceId);
    expect(host.stack[1]!.cardId).toBe("BT22-004");
    expect(host.stack[2]!.cardId).toBe("BT22-043");
    expect(host.topCard?.instanceId).toBe(s.inst("next").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.memory).toBe(2);

    const deckAfterFirst = s.state.players[0]!.deck.length;
    const second = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: terriermon.instanceId,
      effectKey,
    });
    expect(second.ok).toBe(false);
    expect(s.state.players[0]!.deck.length).toBe(deckAfterFirst);
  });

  it("does not offer the evolution for a non-CS addition or a different stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-043", under: ["BT22-004", "BT1-009"], as: "host" },
            { card: "BT22-043", under: ["BT22-044"], as: "otherHost" },
          ],
          hand: ["BT22-047"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const nonCs = s.perm("host").stack.find((card) => card.cardId === "BT1-009")!;
    const cs = s.perm("otherHost").stack.find((card) => card.cardId === "BT22-044")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [nonCs.instanceId],
      byEffectSeat: 0,
    });
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("otherHost").permanentId,
      addedDigivolutionCardInstanceIds: [cs.instanceId],
      byEffectSeat: 0,
    });

    expect(s.perm("host").topCard?.cardId).toBe("BT22-043");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-047")).toBe(true);
  });

  it("allows the player to refuse the optional evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-043", under: ["BT22-004", "BT22-044"], as: "host" }],
        hand: ["BT22-047"],
      },
    });
    await s.ready();
    const added = s.perm("host").stack.find((card) => card.cardId === "BT22-044")!;

    const pending = advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
      byEffectSeat: 0,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"), 60);
    const prompt = s.decisions.find((decision) => decision.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;

    expect(s.perm("host").topCard?.cardId).toBe("BT22-043");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-047")).toBe(true);
  });
});
