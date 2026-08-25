import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-047.js";
import "../index.js";

const CARD_ID = "EX10-047";

describe("EX10-047 Arukenimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Red"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
    });
  });

  it("proves hand-trash DP-budget deletion and restricted Myotismon-text Tamer play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "DeleteByDPBudget",
          target: { filter: { controller: "opponent", kind: ["Digimon"] } },
          baseBudget: 6000,
          upTo: true,
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }],
              excludeSameNameAsOwnTamers: true,
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("pays exactly 1 hand card to delete up to 6000 total opposing DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "arukenimon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: {
          battleArea: [
            { card: "EX10-040", as: "first", dp: 3000 },
            { card: "EX10-040", as: "second", dp: 3000 },
            { card: "EX10-043", as: "survivor", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId, s.perm("survivor").permanentId);
    await s.ready();
    const survivorId = s.perm("survivor").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("arukenimon"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);
  });

  it("Q5129 plays a Myotismon-text Tamer but excludes names already among own Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "arukenimon" },
            { card: "BT16-089", as: "existing" },
          ],
          trash: [
            { card: "BT16-089", as: "duplicate" },
            { card: "EX10-065", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("duplicate").instanceId, s.inst("eligible").instanceId);
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("arukenimon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("eligible").instanceId),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("eligible").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("duplicate").instanceId);
  });
});
