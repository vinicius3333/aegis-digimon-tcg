import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-062.js";

describe("BT23-062 Dracmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-062")).toMatchObject({
      cardId: "BT23-062",
      nameEn: "Dracmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Undead", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("trashes exactly one matching hand card to gain 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062" }],
          hand: [
            { card: "BT23-063", as: "matching" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const matchingId = s.inst("matching").instanceId;
    const plainId = s.inst("plain").instanceId;
    const before = s.state.memory;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(before + 1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === matchingId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainId)).toBe(true);
  });

  it("gains 1 memory by trashing a matching card from hand, without an optional decline", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Undead", "Dark Animal", "CS"], match: "trait" }],
          },
          count: 1,
        },
      },
      abortOnDecline: true,
    });
    expect(action.optional).toBeUndefined();
  });

  it("does not gain memory or trash a nonmatching hand card when the cost is unavailable", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-062" }], hand: [{ card: "BT1-009", as: "plain" }] },
    });
    const plainId = s.inst("plain").instanceId;
    const before = s.state.memory;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(before);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainId)).toBe(true);
  });

  it("digivolves a realistic carrier into an Undead card from trash when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-064", under: ["BT23-062"], as: "host" }],
          trash: [{ card: "BT23-066", as: "matadormon" }],
        },
        1: { security: ["BT1-028", "BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("matadormon").instanceId);
    expect([...s.perm("host").stack, s.perm("host").topCard!].map((card) => card.cardId)).toEqual([
      "BT23-062",
      "BT23-064",
      "BT23-066",
    ]);
    expect(s.state.memory).toBe(2);
  });

  it("has an inherited once-per-turn trash digivolution into an Undead or Dark Animal Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
        },
      ],
    });
  });

  it("requires a level 2 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-003", as: "base" }], hand: [{ card: "BT23-062", as: "dracmon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("dracmon").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});
