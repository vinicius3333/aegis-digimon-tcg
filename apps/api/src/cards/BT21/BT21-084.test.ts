import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-084.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT21-073.js";

describe("BT21-084 Haru Shinkai", () => {
  it("sets memory at the start of turn, draws on linking, and fuses from hand", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "SetMemory",
            value: 3,
            condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
          }),
        ],
      }),
    );
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    const linkedActions = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions;
    expect(linkedActions?.[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "suspend" } });
    expect(linkedActions?.[1]).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
    expect(yourTurn?.actions).toHaveLength(1);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("app fuses only from the linked-trigger window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon", linked: [{ card: "BT21-070", as: "gossipmon" }] },
          ],
          hand: ["BT21-073"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("sociamon").permanentId,
    });

    expect(s.perm("sociamon").topCard?.cardId).toBe("BT21-073");
    expect(s.perm("sociamon").stack.some((card) => card.cardId === "BT21-043")).toBe(false);
  });
});
