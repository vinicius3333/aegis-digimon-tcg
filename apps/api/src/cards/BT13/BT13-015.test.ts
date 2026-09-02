import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-015.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT13-008.js";
import "./BT13-015.js";

describe("BT13-015 RizeGreymon", () => {
  it("uses exact bracketed names for its GeoGreymon evolution and Marcus Damon references", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["GeoGreymon"], cost: 3, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ target: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          actions: [
            {
              source: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          actions: [
            {
              source: { filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] } },
            },
          ],
        },
      ],
    });
  });

  it("digivolves from GeoGreymon for 3 and may play Marcus Damon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092"));
    expect(s.state.memory).toBe(7);
  });

  it("does not play the near-name Marcus Damon & Agumon Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "AD1-021", as: "nearMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").topCard.cardId === "BT13-015");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nearMarcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "AD1-021")).toHaveLength(
      0,
    );
  });

  it("may decline to play Marcus Damon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-012", as: "geo" }],
          hand: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("geo").permanentId,
        instanceId: s.inst("rize").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("geo").topCard.cardId === "BT13-015");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("places the deleted Marcus Damon itself from trash face down on top of security (Q2274)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-015", as: "rize" },
            { card: "BT13-008", as: "agumon" },
            { card: "BT12-092", as: "marcus" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const marcusId = s.perm("marcus").topCard.instanceId;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("agumon"));
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
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
          battleArea: [
            { card: "BT1-021", as: "host", under: ["BT13-015"] },
            { card: "BT12-092", as: "firstMarcus" },
            { card: "BT13-094", as: "kristy" },
          ],
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
