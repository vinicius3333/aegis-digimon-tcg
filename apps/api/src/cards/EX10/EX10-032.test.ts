import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-032.js";
import "../index.js";

const CARD_ID = "EX10-032";

describe("EX10-032 Proganomon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
    });
  });

  it("proves hand digivolution, shared buffs, inherited De-Digivolve, and complete coverage", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromHand: true,
      condition: { kind: "youHave" },
      actions: [{ kind: "DigivolveViaPlacement", cost: 3, ignoreDigivolutionRequirements: true }],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Collision" }, target: { bindAs: "chosen" } },
          { kind: "GainKeyword", target: { fromSelectionRef: "chosen" }, keyword: { keyword: "Piercing" } },
          { kind: "ModifyDP", target: { fromSelectionRef: "chosen" }, amount: 3000 },
        ],
      });
    }

    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          actions: [{ kind: "DeDigivolve", amount: 1 }],
        },
      ],
    });
  });

  it("encodes the executable placement sequence", () => {
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "DigivolveViaPlacement",
      cost: 3,
      placeCost: {
        kind: "placeFromTrash",
        destination: "digivolutionStack",
        position: "bottom",
        hostFilter: { nameOrTrait: [{ tokens: ["Sunarizamon"], match: "name" }] },
      },
      into: { isSelfRef: true },
      ignoreDigivolutionRequirements: true,
    });
  });

  it("Q5091 places Landramon under Sunarizamon and hand-digivolves for the reduced cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "suna" },
            { card: "EX10-063", as: "close" },
          ],
          hand: [{ card: CARD_ID, as: "proganomon" }],
          trash: [{ card: "EX10-028", as: "landramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [entry] = JSON.parse(s.inst("proganomon").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("proganomon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suna").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
    expect(s.perm("suna").stack[0]?.instanceId).toBe(s.inst("landramon").instanceId);
  });

  it("Q5093 trashes a Mineral source from another stack and gives all buffs to one target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX10-028", as: "costHost", under: [{ card: "EX10-025", as: "cost" }] },
            { card: "EX10-028", as: "target" },
            { card: "BT1-009", as: "near" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("near").permanentId, s.perm("target").permanentId);
    await s.ready();
    const baseDp = s.perm("target").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("near"))).toBe(false);
  });

  it("the inherited watcher De-Digivolves only from a Mineral/Rock host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-028", as: "host", under: [{ card: CARD_ID, as: "source" }] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target", under: [{ card: "BT1-009", as: "base" }] }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 0);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("base").instanceId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-019");

    const blocked = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }] },
      1: { battleArea: [{ card: "BT1-019", as: "target", under: [{ card: "BT1-009", as: "base" }] }] },
    });
    await blocked.ready();
    await advance(blocked.engine).verb.trashDigivolutionCards(
      blocked.perm("host").permanentId,
      [blocked.inst("source").instanceId],
      0,
    );
    expect(blocked.perm("target").topCard.cardId).toBe("BT1-019");
  });
});
