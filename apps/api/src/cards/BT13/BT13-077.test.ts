import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-077.js";
import "./BT13-011.js";
import "./BT13-058.js";

describe("BT13-077 Craniamon", () => {
  it("grants Blocker and opponent-Digimon effect immunity through the opponent's turn", () => {
    expect(
      compiled.effects
        ?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger))
        .every((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Blocker")),
    ).toBe(true);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
        actions: [
          {
            kind: "GrantStatic",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            grant: "immuneToOpponentDigimonEffects",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
  });

  it("optionally makes an opponent Digimon attack the player at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      actions: [
        {
          kind: "Attack",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
          attackPlayer: true,
        },
      ],
    });
  });

  it("installs opponent Digimon-effect immunity when played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-077", as: "craniamon", dp: 3000 }] },
        1: { hand: [{ card: "BT13-011", as: "opponentEffect" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("craniamon"));
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("craniamon").permanentId)).toBe(true);
  });

  it("makes a chosen opponent Digimon attack the player at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-077", as: "craniamon", suspended: true }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;
    const securityInstanceId = s.inst("security").instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const choice = s.decisions.find(({ req }) => req.kind === "optional")!;
    expect(choice.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(
      s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === attackerPermanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === attackerInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
  });

  it("lets Craniamon's controller decline choosing an attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-077", as: "craniamon", suspended: true }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;
    const securityInstanceId = s.state.players[0]!.security[0]!.instanceId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const choice = s.decisions.find(({ req }) => req.kind === "optional")!;
    expect(choice.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(
      s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === attackerPermanentId),
    ).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === attackerInstanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === securityInstanceId)).toBe(true);
  });

  it("allows choosing an opposing Digimon immune to effects (Q2320)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-077", as: "craniamon", suspended: true }], security: ["BT1-009"] },
        1: { hand: [{ card: "BT13-077", as: "immuneAttacker" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("immuneAttacker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("immuneAttacker").instanceId),
    );
    expect(observe(s.engine).isRestrictedByEffect(s.perm("immuneAttacker"), "beAffected", "Digimon")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const choice = s.decisions.find(({ req }) => req.kind === "optional")!;
    expect(choice.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.req.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("immuneAttacker").permanentId,
      ),
    ).toBe(true);
  });

  it("keeps When Digivolving immunity against a real opposing Digimon effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-052", as: "base" }], hand: [{ card: "BT13-077", as: "craniamon" }] },
        1: { battleArea: [{ card: "BT13-056", as: "leopard" }], hand: [{ card: "BT13-058", as: "mode" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("craniamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT13-077");
    await settle();
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").stack.some((card) => card.instanceId === baseInstanceId)).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("leopard").permanentId,
        instanceId: s.inst("mode").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("leopard").topCard?.cardId === "BT13-058");

    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("uses Blocker in a real opponent attack block window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-077", as: "blocker" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("blocker").permanentId],
    });

    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.perm("blocker").isSuspended).toBe(true);
  });
});
