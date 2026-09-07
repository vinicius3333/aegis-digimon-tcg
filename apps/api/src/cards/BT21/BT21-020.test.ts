import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-020.js";
import "../index.js";

describe("BT21-020 Aldamon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("reduces the hand digivolution cost only when the source stack contains Agunimon or BurningGreymon", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: { zone: "hand", controllerDefault: "mine" },
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: { nameOrTrait: [{ tokens: ["Agunimon", "BurningGreymon"], match: "nameExact" }] },
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      }),
    );
  });

  it("plays a red Tamer with inherited effects when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-020", as: "aldamon" }],
          hand: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("aldamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082")).toBe(true);
  });

  it.each([
    ["Agunimon", "BT21-014", "BT21-013", 3],
    ["BurningGreymon", "BT21-013", "BT21-014", 3],
    ["no matching source", "BT21-014", "BT1-009", 4],
  ])("pays the correct cost with %s in its evolution cards", async (_label, top, source, expectedCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: top, as: "level4", under: [source] }],
          hand: [{ card: "BT21-020", as: "aldamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("level4").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("level4").topCard.cardId === "BT21-020");
    expect(s.state.memory).toBe(6 - expectedCost);
  });

  it("may decline the deletion play and rejects ineligible Tamers", async () => {
    const declined = setupEngine(
      { 0: { battleArea: [{ card: "BT21-020", as: "aldamon" }], trash: [{ card: "BT21-082", as: "takuya" }] } },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).verb.deletePermanent([declined.perm("aldamon").permanentId], "byEffect");
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT21-082");

    const ineligible = setupEngine(
      { 0: { battleArea: [{ card: "BT21-020", as: "aldamon" }], hand: [{ card: "BT1-085", as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await ineligible.ready();
    await advance(ineligible.engine).verb.deletePermanent([ineligible.perm("aldamon").permanentId], "byEffect");
    await settle(() => ineligible.state.pendingDecision === undefined);
    expect(ineligible.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-085");
  });

  it("applies the same deletion effect when Aldamon is inherited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "host", under: ["BT21-020"] }],
          trash: [{ card: "BT21-082", as: "takuya" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-082")).toBe(true);
  });

  it("performs two security checks with Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-020", as: "aldamon" }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aldamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it.each([
    ["hand", true],
    ["trash", true],
    ["hand", false],
    ["trash", false],
  ] as const)("resolves the public deletion Tamer choice from %s with accept=%s", async (zone, accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-020", as: "aldamon", suspended: true }],
          [zone]: [{ card: "BT21-082", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT21-062", as: "attacker" }] },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const aldamonId = s.inst("aldamon").instanceId;
    const tamerId = s.inst("tamer").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("aldamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.trash.some((card) => card.instanceId === aldamonId) && !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === aldamonId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === tamerId)).toBe(accept);
    expect(s.state.players[0]![zone].some((card) => card.instanceId === tamerId)).toBe(!accept);
    expect(s.state.memory).toBe(3);
  });

  it("fires inherited deletion from a legal level-6 host after battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-025", as: "host", suspended: true, under: ["BT21-020"] }],
          hand: [{ card: "BT21-082", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT21-062", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-082"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT21-082")).toBe(true);
  });
});
