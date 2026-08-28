import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT16-086.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT16-086", () => {
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

  it("models Mind Link and inherited Pulsemon protection", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Mind Link" }],
      actions: [{ kind: "MindLink" }],
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      target: { filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
    });
    expect(compiled.effects?.[2]?.actions?.[0]).not.toMatchObject({ target: { filter: { trait: ["Pulsemon"] } } });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Blocker" } } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Barrier" } } },
      ],
    });
  });

  it("can play a Hacker Judge from its digivolution cards as inherited", () => {
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

  it("Mind Links to a Pulsemon-text Digimon through the public Main intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-086", as: "hacker" },
            { card: "BT16-039", as: "pulsemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("hacker")) as { effectKey: string }[];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("hacker").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").stack.some((card) => card.cardId === "BT16-086"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-086")).toBe(false);
    expect(s.perm("pulsemon").stack.map((card) => card.cardId)).toContain("BT16-086");
  });

  it("plays Hacker Judge from this host's own stack at end of all turns", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-039", as: "pulsemon", under: ["BT16-086"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("pulsemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("pulsemon"), "Barrier")).toBe(true);
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-086"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-086")).toBe(true);
    expect(s.perm("pulsemon").stack.some((card) => card.cardId === "BT16-086")).toBe(false);
  });
});
