import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-087.js";

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
      actions: [{ kind: "MindLink" }, { kind: "PlaceUnder" }],
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
      actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }],
    });
  });

  it("sets memory to 3 at the start of its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-087", as: "kosuke" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("kosuke"));
    expect(s.state.memory).toBe(3);
  });

  it("mind-links to an X Antibody Digimon and places Kosuke underneath it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-087", as: "kosuke" },
            { card: "BT16-051", as: "dorumon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("kosuke").topCard.instanceId,
        effectKey: `BT16-087/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    expect(s.perm("dorumon").stack.some((card) => card.cardId === "BT16-087")).toBe(true);
  });
});
