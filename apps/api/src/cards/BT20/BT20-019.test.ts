import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-019.js";
import "./index.js";
import "../ST22/ST22-08.js";

describe("BT20-019 Jesmon (X Antibody)", () => {
  it("keeps the post-condition attack independent and gates only the temporary immunity", () => {
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "immuneToOpponentEffects",
      duration: "forTheTurn",
      condition: {
        kind: "selfDigivolutionStackMatchesFilter",
        filter: {
          nameOrTrait: [
            { tokens: ["Jesmon"], match: "nameExact" },
            { tokens: ["X Antibody"], match: "nameExact" },
          ],
        },
      },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "Attack", optional: true });
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(yourTurn).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          target: {
            count: "all",
            filter: {
              nameOrTrait: [
                { tokens: ["Sistermon"], match: "name" },
                { tokens: ["Royal Knight"], match: "trait" },
              ],
            },
          },
        },
        { kind: "GrantCanAttackUnsuspended", target: { count: "all" } },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { condition: { kind: "selfHasName", names: ["Jesmon GX"] } },
        { condition: { kind: "selfHasName", names: ["Jesmon GX"] } },
      ],
    });
  });

  it("grants temporary opponent-effect immunity when Jesmon is in the evolved stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-017", as: "jesmon" },
            { card: "BT20-010", as: "ally" },
          ],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
    expect(
      ["jesmon", "ally"].some((alias) =>
        observe(s.engine).isRestrictedByEffect(s.perm(alias), "beAffected", "Digimon"),
      ),
    ).toBe(true);
    expect(s.perm("jesmon").isSuspended).toBe(false);
  });

  it.each([
    ["trait-only X Antibody Digimon", "BT9-008", false],
    ["exact X Antibody Option", "BT9-109", true],
    ["Proto Form Rule Name", "EX5-070", true],
  ] as const)("uses exact bracket-name semantics for %s in the stack", async (_label, sourceCard, qualifies) => {
    const stackSources = sourceCard === "BT9-008" ? ["BT9-008", "BT15-009"] : [sourceCard, "BT9-008", "BT15-009"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-014", as: "jesmon", under: stackSources }],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
    expect(observe(s.engine).isRestrictedByEffect(s.perm("jesmon"), "beAffected", "Digimon")).toBe(qualifies);
  });

  it("still allows the post-then attack when the stack condition is false", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-014", as: "savior" }],
          hand: [{ card: "BT20-019", as: "xAntibody" }],
        },
        1: { security: ["BT20-001", "BT20-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("savior").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("savior").isSuspended);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("savior"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("savior").isSuspended).toBe(true);
  });

  it("on your turn grants Piercing and unsuspended-target attacks only to Sistermon and Royal Knights", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-019", as: "source" },
          { card: "BT20-084", as: "sistermon" },
          { card: "BT20-017", as: "royalKnight" },
          { card: "BT20-010", as: "nonMatch" },
        ],
      },
    });
    await s.ready();
    for (const alias of ["source", "sistermon", "royalKnight"]) {
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(true);
      expect(observe(s.engine).canAttackUnsuspended(s.perm(alias))).toBe(true);
    }
    expect(observe(s.engine).hasPierce(s.perm("nonMatch"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("nonMatch"))).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("sistermon"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("royalKnight"))).toBe(false);
  });

  it("under Jesmon GX grants both abilities to every allied Digimon on your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-021", as: "gx", under: ["BT20-019"] },
          { card: "BT20-010", as: "ally" },
        ],
      },
    });
    await s.ready();
    for (const alias of ["gx", "ally"]) {
      expect(observe(s.engine).hasPierce(s.perm(alias))).toBe(true);
      expect(observe(s.engine).canAttackUnsuspended(s.perm(alias))).toBe(true);
    }
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(false);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("ally"))).toBe(false);
  });
  it("allows the optional post-then attack to be refused", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-017", as: "jesmon" }], hand: [{ card: "BT20-019", as: "xAntibody" }] },
        1: { security: ["BT20-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jesmon").topCard.cardId === "BT20-019");
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly evolves the legal Jesmon to Jesmon X to GX stack and exposes inherited abilities", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-019", as: "xAntibody", under: ["BT20-017"] },
          { card: "BT20-084", as: "sister" },
        ],
        hand: [{ card: "BT20-021", as: "gx" }],
      },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xAntibody").permanentId,
        instanceId: s.inst("gx").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xAntibody").topCard.cardId === "BT20-021");
    expect(s.perm("xAntibody").stack.map((card) => card.cardId)).toEqual(["BT20-017", "BT20-019"]);
    expect(observe(s.engine).hasPierce(s.perm("sister"))).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("sister"))).toBe(true);
  });

  it("protects against Security deletion for the turn, then loses that protection", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-017", as: "jesmon" }],
          hand: [{ card: "BT20-019", as: "xAntibody" }, "BT20-010"],
          deck: ["BT20-010", "BT20-010"],
        },
        1: { security: ["ST22-08", "ST22-08"], deck: ["BT20-010"], hand: ["BT20-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const attackerId = s.perm("jesmon").permanentId;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: attackerId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestrictedByEffect(s.perm("jesmon"), "beAffected", "Option"));
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand.filter((card) => card.cardId === "ST22-08")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(observe(s.engine).isRestrictedByEffect(s.perm("jesmon"), "beAffected", "Option")).toBe(false);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-019")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
