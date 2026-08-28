import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-087.js";
import "../index.js";

describe("BT16-087", () => {
  it("plays itself from security and sets memory to 3 from 2 or less", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
  });

  it("models Mind Link and inherited Piercing/Blocker", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [{ kind: "MindLink" }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } },
      ],
    });
  });

  it("can play Kosuke Kisakata from its digivolution cards as inherited", () => {
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "EndOfAllTurns",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
        },
      ],
    });
  });

  it("sets memory to 3 at the start of its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-087", as: "kosuke" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kosuke"));
    expect(s.state.memory).toBe(3);
  });

  it("Mind Links to an X Antibody Digimon through the public Main intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-087", as: "kosuke" },
            { card: "BT16-051", as: "dorumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("kosuke")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("kosuke").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorumon").stack.some((card) => card.cardId === "BT16-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-087")).toBe(false);
    expect(s.perm("dorumon").stack.some((card) => card.cardId === "BT16-087")).toBe(true);
  });

  it("plays Kosuke Kisakata from this host's own stack at end of all turns", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-051", as: "dorumon", under: ["BT16-087"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("dorumon"), "Piercing")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dorumon"), "Blocker")).toBe(true);
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-087")).toBe(true);
    expect(s.perm("dorumon").stack.some((card) => card.cardId === "BT16-087")).toBe(false);
  });
});
