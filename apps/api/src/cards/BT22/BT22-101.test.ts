import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-101.js";

describe("BT22-101 Kyoko Kuremi", () => {
  it("sets memory to three at the start of your turn when memory is two or less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("returns a CS Digimon from trash when a level 4 or higher CS Digimon is deleted", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levelComparison: { op: "gte", value: 4 },
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Return",
          to: "hand",
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(watcher.actions[0].target.filter).toMatchObject({
      zone: "trash",
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
    });
  });

  it("digivolves itself into Alphamon only when it unsuspends and no Alphamon is present", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      sourceFilter: { isSelfRef: true },
      fireCondition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        cardId: "BT22-063",
        nameOrTrait: [{ tokens: ["Alphamon"], match: "name" }],
      },
      from: ["hand"],
      reduceCost: 2,
      payCost: true,
      optional: true,
      condition: {
        kind: "youHaveNone",
        filter: { nameOrTrait: [{ tokens: ["Alphamon"], match: "name" }] },
      },
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });

  it("sets memory through the public start-turn timing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-101", as: "kyoko" }] },
    });
    s.state.memory = 2;
    await advance(s.engine).fireForInstance(EffectTiming.OnStartTurn, s.perm("kyoko").topCard!);
    expect(s.state.memory).toBe(3);
  });

  it("pays the reduced cost and respects Alphamon's Kyoko evolution requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-101", as: "kyoko", suspended: true }],
          hand: [{ card: "BT22-063", as: "alphamon" }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("kyoko").permanentId,
    });
    await settle(() => s.perm("kyoko").topCard?.cardId === "BT22-063");

    expect(s.state.memory).toBe(2);
    expect(s.perm("kyoko").stack.at(-1)?.cardId).toBe("BT22-101");
  });

  it("reaches the evolution through the real turn-start unsuspend flow", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-101", as: "kyoko", suspended: true }],
          deck: ["BT1-001"],
          hand: [{ card: "BT22-063", as: "alphamon" }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("kyoko").topCard?.cardId).toBe("BT22-063");
    expect(s.perm("kyoko").stack.at(-1)?.cardId).toBe("BT22-101");
  });

  it("does not attempt Alphamon when Kyoko's alternate requirement is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-101", as: "kyoko", suspended: true }],
          hand: [{ card: "BT22-063", as: "alphamon" }],
          security: 4,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("kyoko").topCard?.cardId).toBe("BT22-101");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-063")).toBe(true);
  });

  it("does not offer an Alphamon with no Kyoko Kuremi digivolution route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-101", as: "kyoko", suspended: true }],
          hand: [{ card: "BT6-111", as: "otherAlphamon" }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("kyoko").topCard?.cardId).toBe("BT22-101");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT6-111")).toBe(true);
  });
});
