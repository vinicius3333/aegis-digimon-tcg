import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-078.js";

describe("BT10-078 GulusGammamon", () => {
  it("uses its exact Gammamon alternate evolution at cost 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-008", as: "base" }], hand: [{ card: "BT10-078", as: "gulus" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-078");
    expect(s.state.memory).toBe(1);
  });

  it("plays Gammamon from trash suspended on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-078", as: "gulus" }],
          trash: [{ card: "BT8-008", as: "gammamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("gulus").permanentId]);
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("gammamon").instanceId,
    );
    expect(played?.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("gains Retaliation only while a Gammamon-named source is in its stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-078", as: "withGammamon", under: ["BT8-008"] },
          { card: "BT10-078", as: "withoutGammamon", under: ["BT1-009"] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("withGammamon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("withoutGammamon"), "Retaliation")).toBe(false);
    assertNoLoudGap(s);
  });

  it("can play the Gammamon that entered trash from its own deleted stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-078",
              as: "gulus",
              under: [{ card: "BT8-008", as: "stackGammamon" }],
            },
          ],
          trash: [{ card: "BT8-008", as: "olderGammamon" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const stackGammamonId = s.inst("stackGammamon").instanceId;
    preferred.push(stackGammamonId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("gulus").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === stackGammamonId));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === stackGammamonId)!;
    expect(played.isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("olderGammamon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });
});
