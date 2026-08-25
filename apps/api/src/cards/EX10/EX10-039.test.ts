import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-039.js";
import "../index.js";

const CARD_ID = "EX10-039";

describe("EX10-039 ChuuChuumon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 3,
      playCost: 4,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Beast", "Bagra Army"],
    });
  });
  it("proves bottom placement to Bagra Army Digimon or Tamers, Save, and inherited Draw 1", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            or: [
              { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
              { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
            ],
          },
          position: "bottom",
          optional: true,
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [{ kind: "PlaceUnder", target: { filter: { isSelfRef: true } }, optional: true }],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("Q5119 places a Bagra Army Digimon from trash at a Bagra Army Tamer's true bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX10-064", as: "tamer", under: [{ card: "BT1-009", as: "old" }] },
            { card: "BT1-085", as: "plainTamer" },
          ],
          trash: [
            { card: "EX10-026", as: "material" },
            { card: "BT1-009", as: "near" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("near").instanceId,
      s.inst("material").instanceId,
      s.perm("plainTamer").permanentId,
      s.perm("tamer").permanentId,
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.perm("tamer").stack[0]?.instanceId).toBe(s.inst("material").instanceId);
    expect(s.perm("tamer").stack[1]?.instanceId).toBe(s.inst("old").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("near").instanceId);
  });

  it("Save moves the deleted card under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "chuu" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("chuu").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("chuu").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === instanceId));
    expect(s.state.players[0]!.trash.map(({ instanceId: id }) => id)).not.toContain(instanceId);
  });

  it("the inherited watcher draws only when discarded from a Bagra Army host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-026", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await blocked.ready();
    await advance(blocked.engine).verb.trashDigivolutionCards(
      blocked.perm("host").permanentId,
      [blocked.inst("source").instanceId],
      0,
    );
    expect(blocked.state.players[0]!.hand).toHaveLength(0);
  });
});
