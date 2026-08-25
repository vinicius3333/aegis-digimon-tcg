import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-051.js";
import "../index.js";

const CARD_ID = "EX10-051";

describe("EX10-051 Mummymon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead"],
    });
  });

  it("proves hand-trash De-Digivolve and restricted Myotismon-text Tamer play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "DeDigivolve",
          amount: 1,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
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

  it("pays exactly 1 hand card to De-Digivolve 1 opposing Digimon by 1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "mummymon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: { battleArea: [{ card: "EX10-053", as: "target", under: [{ card: "EX10-042", as: "lower" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mummymon"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("lower").instanceId);
  });

  it("Q5134 plays a Myotismon-text Tamer but excludes names already among own Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "mummymon" },
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
    await advance(s.engine).verb.deletePermanent([s.perm("mummymon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("eligible").instanceId),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("eligible").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("duplicate").instanceId);
  });
});
