import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-008.js";
import "./BT13-015.js";

describe("BT13-015 RizeGreymon", () => {
  it("digivolves from GeoGreymon for 3 and may play Marcus Damon from hand for free", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-012", as: "geo" }], hand: [{ card: "BT13-015", as: "rize" }, { card: "BT12-092", as: "marcus" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("geo").permanentId, instanceId: s.inst("rize").instanceId, alternateRequirementIndex: 0 })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092"));
    expect(s.state.memory).toBe(7);
  });

  it("places the deleted Marcus Damon itself from trash face down on top of security (Q2274)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-015", as: "rize" }, { card: "BT13-008", as: "agumon" }, { card: "BT12-092", as: "marcus" }], security: ["BT1-001"] } },
      { autoSelectCards: true },
    );
    const marcusId = s.perm("marcus").topCard.instanceId;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("agumon")) as { effectKey: string }[];
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("agumon").topCard.instanceId, effectKey: effect!.effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();

    await advance(s.engine).verb.deletePermanent([s.perm("marcus").permanentId]);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(marcusId);
    expect(s.state.players[0]!.security[0]?.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === marcusId)).toBe(false);
  });

  it("provides the same once-per-turn security placement as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "host", under: ["BT13-015"] }, { card: "BT12-092", as: "firstMarcus" }, { card: "BT13-094", as: "kristy" }],
          trash: [{ card: "BT12-092", as: "trashMarcus" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstMarcus").permanentId]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    await advance(s.engine).verb.deletePermanent([s.perm("kristy").permanentId]);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
