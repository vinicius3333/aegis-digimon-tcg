import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-177.js";
import "../BT21/BT21-064.js";
import "../BT21/BT21-068.js";
import "../BT21/BT21-076.js";

describe("P-177 Gigimon", () => {
  it("encodes its optional inherited On Deletion return of a named Growlmon or Gallantmon", () => {
    expect(runtimeCompiledCard("P-177")!.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Return",
          optional: true,
          to: "hand",
          target: {
            count: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("returns a named Growlmon from trash when its inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["P-177"] }],
          trash: [{ card: "BT12-010", as: "growlmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
  });

  it("keeps a simultaneous Growlmon inherited trigger pending after returning that card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-076", as: "host", under: ["P-177", "BT21-068"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-068")).toBe(true);
    expect(s.state.memory).toBe(1);
    const returned = s.events.findIndex((event) => event.kind === "cardsMoved" && event.to === "hand");
    const memoryTrigger = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "BT21-068",
    );
    expect(returned).toBeGreaterThanOrEqual(0);
    expect(memoryTrigger).toBeGreaterThan(returned);
  });

  it("cancels a top-card inherited trigger when P-177 returns that deleted top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-068", as: "host", under: ["P-177", "BT21-064"] }],
          hand: [{ card: "BT21-064", as: "discardable" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-068")).toBe(true);
    expect(s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT21-064")).toBe(false);
  });

  it("runs BT21-064 inherited memory when its top host remains in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-068", as: "host", under: ["BT21-064"] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.memory).toBe(1);
  });
});
