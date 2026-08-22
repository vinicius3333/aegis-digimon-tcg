import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-056.js";

describe("EX4-056 Crowmon", () => {
  it("may digivolve into Ravemon from hand when a purple Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], optional: true, into: { nameOrTrait: [{ match: "name", tokens: ["Ravemon"] }] }, condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Purple"] } } });
  });
  it("inherits deletion of an opposing level five or lower Digimon outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ isInherited: true, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } }, condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } } }] });
  });

  it("deletes an opposing level-five Digimon when deleted outside battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-056"] }] },
      1: { battleArea: [{ card: "BT5-042", as: "target" }] },
    }, { autoSelectCards: true });
    const targetInstanceId = s.perm("target").topCard.instanceId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
});
