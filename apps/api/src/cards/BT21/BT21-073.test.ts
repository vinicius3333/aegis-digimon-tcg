import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-073.js";
import "../index.js";
describe("BT21-073 Charismon", () => {
  it("links from trash or stack and grants the once-per-turn attack token", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving")).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenLinked" })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isLinked: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Replacement",
            event: "wouldLeavePlay",
            actions: [
              expect.objectContaining({
                kind: "Prevent",
                cost: expect.objectContaining({
                  kind: "trash",
                  target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 },
                }),
              }),
            ],
          }),
        ],
      }),
    );
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("links an eligible Appmon from trash when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-073", as: "charismon" }],
          battleArea: [{ card: "BT21-009", as: "host" }],
          trash: [{ card: "BT21-070", as: "gossipmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("charismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").linked.some((card) => card.cardId === "BT21-070"));

    expect(s.perm("host").linked.map((card) => card.cardId)).toContain("BT21-070");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-070")).toBe(false);
  });
});
