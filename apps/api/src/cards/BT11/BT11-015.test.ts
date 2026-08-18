import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-015.js";

describe("BT11-015 OmniShoutmon", () => {
  it("deletes two 4000-DP Digimon when Shoutmon is in its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-015", as: "omni", under: ["BT10-008"] }] },
      1: { battleArea: [
        { card: "BT1-009", as: "one", dp: 4000 },
        { card: "BT1-010", as: "two", dp: 4000 },
      ] },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("grants Security Attack +1 to a Shoutmon-named host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-008", as: "host", under: ["BT11-015"] }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("Saves itself under a Tamer on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "BT11-015", as: "omni" },
        { card: "BT10-087", as: "taiki" },
      ] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const omniCardId = s.perm("omni").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("omni").permanentId]);
    await settle(() => s.perm("taiki").stack.some(({ instanceId }) => instanceId === omniCardId));

    expect(s.perm("taiki").stack.some(({ instanceId }) => instanceId === omniCardId)).toBe(true);
  });
});
