import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-087.js";
import "./BT20-012.js";
import "./BT20-048.js";
import "./BT20-051.js";

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

  it("publishes the catalog identity and complete compiled coverage", () => {
    expect(getCardDefinition("BT20-087")).toMatchObject({
      cardId: "BT20-087",
      nameEn: "Kota Domoto & Yuji Musya",
      colors: ["Black", "Red"],
      kinds: ["Tamer"],
      playCost: 5,
      dp: 0,
      forms: ["-"],
      attributes: ["-"],
      types: ["Chronicle"],
      effectText: expect.stringContaining("When one of your [Chronicle]"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
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

  it("offers a breeding recipient in the target set and evolves a selected recipient (Q4428/Q4429)", async () => {
    const options = {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: [] as string[],
    };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-087", as: "tamer" },
            // A second legal Dorumon recipient forces a public target choice, so this
            // proof explicitly selects the breeding-area permanent rather than relying
            // on the harness' default target order.
            { card: "BT20-048", as: "attacker" },
          ],
          breeding: { card: "BT20-048", as: "breedingBase" },
          hand: [
            { card: "BT20-051", as: "evolution" },
            { card: "BT20-087", as: "wouldPlay" },
          ],
          deck: ["BT20-010", "BT20-010"],
        },
        1: { security: ["BT20-010", "BT20-010"], deck: ["BT20-010", "BT20-010"] },
      },
      options,
    );
    s.state.memory = 3;
    const attackerId = s.perm("attacker").permanentId;
    const breedingId = s.perm("breedingBase").permanentId;
    options.preferInstanceIds.push(attackerId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-051"));
    const targetDecision = [...s.decisions].reverse().find(({ req }) => req.kind === "chooseTargets")!.req;
    const candidateIds = targetDecision.options?.candidateInstanceIds;
    if (candidateIds === undefined) throw new Error("target decision omitted candidate ids");
    expect(candidateIds).toContain(breedingId);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-051"));
    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-051")!;
    expect(evolved.stack.map((card) => card.cardId)).toEqual(["BT20-048"]);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("wouldPlay").instanceId);
  });

  it.each([2, 3, 4] as const)("handles the natural Start of Your Turn memory boundary at %s", async (memory) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-087", as: "tamer" }], hand: ["BT1-010"], deck: ["BT1-010", "BT1-010"] },
      1: { deck: ["BT1-010", "BT1-010"] },
    });
    s.state.memory = memory;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(memory <= 2 ? 3 : memory);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays the exact Kota/Yuji instance from a public security check without cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }], deck: ["BT1-010"] },
      1: { security: [{ card: "BT20-087", as: "securityTamer" }], deck: ["BT1-010"] },
    });
    const tamerId = s.inst("securityTamer").instanceId;
    await s.ready();
    const beforeMemory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === tamerId));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === tamerId)).toBe(true);
    expect(s.state.memory).toBe(beforeMemory);
  });
});
