import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-231.js";

describe("P-231 Unique Emblem: Invincibly Invisible", () => {
  it("reveals three, adds Cyborg or Machine and LIBERATOR cards, and places itself", () => {
    expect(
      runtimeCompiledCard("P-231")!.effects.find(
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
                nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
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
    const effect = runtimeCompiledCard("P-231")!.effects.find((entry) => entry.trigger === "YourTurn");
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

describe("P-231 engine behavior", () => {
  it("adds a Cyborg and LIBERATOR from the reveal and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-231", as: "emblem" }],
          deck: [{ card: "AD1-003", as: "cyborg" }, { card: "BT18-060", as: "liberator" }, "BT1-001"],
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
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("cyborg").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-231")).toBe(true);
  });

  it("runs its Cyborg/LIBERATOR reveal when checked from Security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "P-231", as: "emblem" }], deck: ["AD1-003", "BT18-060", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("emblem").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "AD1-003")).toBe(true);
  });

  it("reacts to its named Tamer and digivolves at a cost reduced by three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-231", as: "emblem" },
            { card: "BT19-052", as: "base" },
          ],
          hand: [
            { card: "BT20-086", as: "altea" },
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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("altea").instanceId })).toEqual({ ok: true });
    const memoryBeforeDigivolve = s.state.memory;
    await settle(() => s.perm("base").topCard.cardId === "BT19-053");
    expect(s.perm("base").topCard.cardId).toBe("BT19-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonLiberator").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("emblem").instanceId)).toBe(true);
    const printedCost = getCardDefinition("BT19-053")!.evoCosts[0]!.memoryCost;
    expect(s.state.memory).toBe(memoryBeforeDigivolve - Math.max(0, printedCost - 3));
  });
});
