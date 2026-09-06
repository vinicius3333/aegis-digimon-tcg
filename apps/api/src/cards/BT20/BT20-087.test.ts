import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-087.js";
import "./BT20-012.js";
import "./BT20-048.js";

describe("BT20-087 Kota Domoto & Yuji Musya", () => {
  it("sets memory to 3 at the start of turn when memory is 2 or less", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).not.toHaveProperty(
      "actions",
    );
  });

  it("only offers the reduced Chronicle digivolution for a field Digimon", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(watcher).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: { controller: "mine", kind: ["Digimon"] },
                orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
              },
              into: {
                levelComparison: { op: "lte", value: 6 },
                nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
              },
              payCost: true,
              reduceCost: 1,
              cost: { kind: "suspend", target: { isSelf: true } },
              abortOnDecline: true,
            },
          ],
        },
      ],
    });
  });

  it("registers exactly one security play effect", () => {
    expect(compiled.effects.filter((entry) => entry.trigger === "Security")).toHaveLength(1);
  });

  it("naturally suspends this Tamer and reduces a Chronicle evolution after an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-087", as: "tamer" },
            { card: "BT20-048", as: "attacker" },
          ],
          hand: [{ card: "BT20-012", as: "evolution" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT20-012");

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
