import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-227.js";

describe("P-227 Unique Emblem: Primal Impact", () => {
  it("reveals three, adds the two printed categories, and places itself", () => {
    expect(
      runtimeCompiledCard("P-227")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.actions[0]?.kind === "RevealAdd",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Tyrannomon"], match: "name" },
                  { tokens: ["Reptile"], match: "trait" },
                  { tokens: ["Dinosaur"], match: "trait" },
                ],
              },
            },
            {
              count: 1,
              to: "hand",
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
            },
          ],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("models the printed reactive Delay bullet", () => {
    const effect = runtimeCompiledCard("P-227")!.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              reduceCost: 3,
              payCost: true,
              optional: true,
              target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
              into: {
                controllerDefault: "mine",
                levelComparison: { op: "lte", value: 6 },
                nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }],
              },
            },
          ],
        },
      ],
    });
  });
});

describe("P-227 engine behavior", () => {
  it("adds a Tyrannomon and LIBERATOR from the reveal and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-227", as: "emblem" }],
          deck: [{ card: "BT1-016", as: "tyrannomon" }, { card: "BT18-060", as: "liberator" }, "BT1-001"],
          battleArea: ["BT1-009", "BT1-037", "BT1-063", "BT1-088", "P-016", "ST6-03", "BT1-084"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("tyrannomon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-227")).toBe(true);
  });

  it("runs the printed Main reveal when this Option is checked in Security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "P-227", as: "emblem" }], deck: ["BT1-016", "BT18-060", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("emblem").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-016")).toBe(true);
  });

  it("reacts to its named Tamer and digivolves at a cost reduced by three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-227", as: "emblem" },
            { card: "BT19-052", as: "base" },
            { card: "BT1-009", as: "color" },
          ],
          hand: [
            { card: "EX8-065", as: "ryutaro" },
            { card: "BT1-080", as: "nonLiberator" },
            { card: "BT19-053", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    const playResult = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryutaro").instanceId });
    expect(playResult).toEqual({ ok: true });
    const memoryBeforeDigivolve = s.state.memory;
    await settle(() => s.perm("base").topCard.cardId === "BT19-053");
    expect(s.perm("base").topCard.cardId).toBe("BT19-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonLiberator").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("emblem").instanceId)).toBe(true);
    const printedCost = getCardDefinition("BT19-053")!.evoCosts[0]!.memoryCost;
    expect(s.state.memory).toBe(memoryBeforeDigivolve - Math.max(0, printedCost - 3));
  });

  it("does not activate for a wrong Tamer or when Delay is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-227", as: "emblem" },
            { card: "BT19-052", as: "base" },
          ],
          hand: [
            { card: "EX8-066", as: "wrongTamer" },
            { card: "BT19-053", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wrongTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("BT19-052");
    expect(s.perm("emblem").topCard.cardId).toBe("P-227");

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-227", as: "emblem" },
            { card: "BT19-052", as: "base" },
          ],
          hand: [
            { card: "EX8-065", as: "ryutaro" },
            { card: "BT19-053", as: "evolution" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.perm("emblem").placedByEffect = true;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("ryutaro").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(declined.perm("base").topCard.cardId).toBe("BT19-052");
    expect(declined.perm("emblem").topCard.cardId).toBe("P-227");
    expect(observe(declined.engine).activatableEffects(declined.perm("emblem"))).toEqual([]);
  });

  it("does not activate when the emblem entered play this turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-227", as: "emblem" },
            { card: "BT19-052", as: "base" },
          ],
          hand: [
            { card: "EX8-065", as: "ryutaro" },
            { card: "BT19-053", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.perm("emblem").placedByEffect = true;
    s.perm("emblem").enterFieldTurnCount = s.state.turnCount;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryutaro").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("BT19-052");
    expect(s.perm("emblem").topCard.cardId).toBe("P-227");
  });
});
