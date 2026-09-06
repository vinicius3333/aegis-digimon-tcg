import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-028.js";
import "./index.js";
import "../BT11/BT11-098.js";

describe("BT20-028 GigaSeadramon", () => {
  it("once per turn plays a level 5 or lower stack card only with the required exact name", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        condition: {
          kind: "selfDigivolutionStackMatchesFilter",
          filter: {
            nameOrTrait: [
              { tokens: ["MetalSeadramon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
          },
        },
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { levelComparison: { op: "lte", value: 5 } }, source: "thisDigimon" },
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
          actions: [{ kind: "DeDigivolve", amount: 2 }],
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(3);
  });

  it("plays a level-5 card only from its own qualifying stack and de-digivolves by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-031", as: "giga", under: ["BT20-026"] },
            { card: "BT20-027", as: "otherHost", under: ["BT20-025"] },
          ],
          hand: [{ card: "BT20-028", as: "gigaEvolution" }],
        },
        1: { battleArea: [{ card: "BT20-017", as: "opponentStack", under: ["BT20-013", "BT20-014"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("giga").permanentId,
        instanceId: s.inst("gigaEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-026"));

    expect(s.perm("giga").stack.map((card) => card.cardId)).toEqual(["BT15-031"]);
    expect(s.perm("otherHost").stack.map((card) => card.cardId)).toEqual(["BT20-025"]);
    expect(s.perm("opponentStack").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("giga"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("giga"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("giga"), "Blocker")).toBe(true);
  });

  it("does not play a stack card with only an X Antibody-trait source through public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-025", as: "wingdramon", under: ["BT15-021", "BT20-023"] }],
          hand: [{ card: "BT20-028", as: "giga" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wingdramon").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wingdramon").topCard.cardId === "BT20-028");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("wingdramon").stack.map((card) => card.cardId)).toEqual(["BT15-021", "BT20-023", "BT20-025"]);
  });

  it("reaches GigaSeadramon from a legal MegaSeadramon/X Antibody stack through public evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-026", as: "mega", under: ["BT20-024"] }],
        hand: [{ card: "BT20-028", as: "giga" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mega").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT20-028");
    expect(s.perm("mega").topCard.cardId).toBe("BT20-028");
    expect(s.perm("mega").stack.map((card) => card.cardId)).toEqual(["BT20-024", "BT20-026"]);
  });

  it.each([true, false])("offers a feasible source play, accepts %s, and leaves the level-6 source", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-031", as: "base", under: ["BT20-022", "BT20-023", "BT20-025"] }],
          hand: [{ card: "BT20-028", as: "giga" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: accept, autoDeclineOptional: !accept },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giga").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-028");
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(accept ? 2 : 1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT15-031");
    expect(s.perm("base").stack).toHaveLength(accept ? 3 : 4);
  });

  it("uses the trait-only source and shares the once-per-turn use across public evolution and attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-026", as: "mega", under: ["BT9-109", "BT20-022", "BT20-023"] }],
          hand: [{ card: "BT20-028", as: "giga" }],
          security: ["BT20-001"],
        },
        1: { battleArea: [{ card: "BT20-014", as: "target" }], security: ["BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mega").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT20-028");
    const afterDigivolving = s.perm("mega").stack.length;
    expect(afterDigivolving).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.perm("mega").stack.length).toBe(3);
  });

  it("accepts X Antibody Proto Form's Rule Name through public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "base", under: ["EX5-070", "BT20-023"] }],
          hand: [
            { card: "BT20-025", as: "wingdramon" },
            { card: "BT20-028", as: "giga" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wingdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-025");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-028");
    expect(s.state.players[0]!.battleArea.length).toBe(2);
  });

  it("triggers De-Digivolve when GigaSeadramon itself is played from a source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-045", as: "host", under: ["BT20-028"] }],
          hand: [{ card: "BT11-098", as: "sourcePlayer" }],
        },
        1: { battleArea: [{ card: "BT20-017", as: "opponent", under: ["BT20-013", "BT20-014"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourcePlayer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-028") &&
        s.perm("opponent").stack.length === 0,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-028")).toBe(true);
    expect(s.perm("opponent").stack).toHaveLength(0);
  });
});
