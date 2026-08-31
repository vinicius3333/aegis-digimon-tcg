import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-229.js";

describe("P-229 Unique Emblem: Narrative Ronde", () => {
  it("reveals three, adds Puppet and LIBERATOR cards, and places itself", () => {
    expect(
      runtimeCompiledCard("P-229")!.effects.find(
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
                nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
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

  it("grants permanent Delay after a Mirai Kinosaki is played", () => {
    expect(runtimeCompiledCard("P-229")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Mirai Kinosaki"], match: "name" }] },
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

  it("exposes a separate Delay Main effect for the reduced LIBERATOR digivolution", () => {
    expect(
      runtimeCompiledCard("P-229")!.effects.find(
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
    expect(runtimeCompiledCard("P-229")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });
});
describe("P-229 engine behavior", () => {
  it("adds a Puppet and LIBERATOR from the reveal and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-229", as: "emblem" }],
          deck: [{ card: "BT1-038", as: "puppet" }, { card: "BT18-060", as: "liberator" }, "BT1-001"],
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
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("puppet").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("liberator").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-229")).toBe(true);
  });

  it("runs its Puppet/LIBERATOR reveal when checked from Security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "P-229", as: "emblem" }], deck: ["BT1-038", "BT18-060", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("emblem").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT1-038")).toBe(true);
  });

  it("arms Delay from a real Mirai play and reduces a LIBERATOR digivolution by three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-229", as: "emblem" },
            { card: "BT19-052", as: "base" },
            { card: "BT1-063", as: "color" },
          ],
          hand: [
            { card: "EX9-067", as: "mirai" },
            { card: "BT19-053", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mirai").instanceId })).toEqual({ ok: true });
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
