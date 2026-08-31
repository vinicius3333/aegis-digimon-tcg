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

  it("grants Delay after a Ryutaro Williams is played", () => {
    expect(runtimeCompiledCard("P-227")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Ryutaro Williams"], match: "name" }] },
          actions: [
            {
              kind: "GainKeyword",
              keyword: { keyword: "Delay", raw: "＜Delay＞" },
              duration: "permanent",
              target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
            },
          ],
        },
      ],
    });
  });

  it("uses Delay to optionally digivolve one Digimon into a level 6 or lower LIBERATOR from hand at -3", () => {
    expect(
      runtimeCompiledCard("P-227")!.effects.find(
        (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 3,
          optional: true,
          target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
          into: {
            controllerDefault: "mine",
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }],
          },
        },
      ],
    });
  });

  it("activates its Main effects from security", () => {
    expect(runtimeCompiledCard("P-227")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
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
      { autoAcceptOptional: true, autoSelectCards: true },
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
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("emblem").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-016")).toBe(true);
  });

  it("arms Delay from a real Ryutaro play and reduces a LIBERATOR digivolution by three", async () => {
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
            { card: "BT19-053", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    const playResult = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryutaro").instanceId });
    expect(playResult).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("emblem"), "Delay"));
    const memoryBeforeDelay = s.state.memory;
    const delay = (
      observe(s.engine).activatableEffects(s.perm("emblem")) as Array<{ effectKey: string; description?: string }>
    ).find((entry) => /delay/i.test(entry.description ?? ""));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("emblem").instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT19-053");
    expect(s.perm("base").topCard.cardId).toBe("BT19-053");
    const printedCost = getCardDefinition("BT19-053")!.evoCosts[0]!.memoryCost;
    expect(s.state.memory).toBe(memoryBeforeDelay - Math.max(0, printedCost - 3));
  });
});
