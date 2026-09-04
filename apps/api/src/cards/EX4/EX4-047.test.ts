import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-047.js";

describe("EX4-047 DarkKnightmon", () => {
  it("grants Blocker to one own Digimon and, while DigiXrosing, one opposing Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { filter: { controller: "mine" } },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { filter: { controller: "opponent" } },
      condition: { kind: "digiXrosCount", minimum: 1 },
    });
  });
  it("reveals two and adds one Blue Flare or Twilight card on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 2,
      rest: "trash",
      add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } }],
    });
  });

  it("requires the inherited condition to be exactly GreyKnightsmon", () => {
    const inherited = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0] as
      | { actions?: unknown[] }
      | undefined;
    expect(inherited?.actions?.[0]).toMatchObject({
      condition: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["GreyKnightsmon"] }] } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-047");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("plays through the exact SkullKnightmon and DeadlyAxemon DigiXros recipe", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX4-047", as: "darkKnight" },
            { card: "EX4-040", as: "skullKnight" },
            { card: "EX4-041", as: "deadlyAxe" },
          ],
          battleArea: [{ card: "BT1-010", as: "ally" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("skullKnight").instanceId, s.inst("deadlyAxe").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-047"));

    const host = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "EX4-047");
    expect(host).toBeDefined();
    expect(host!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-040", "EX4-041"]));
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Blocker")).toBe(true);
  });

  it("grants only the own Blocker without DigiXrosing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-047", as: "source" },
            { card: "BT1-010", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Blocker")).toBe(false);
  });

  it("reveals two cards on deletion, adds a matching trait, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-047", as: "source" }], deck: ["EX4-021", "BT10-056"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX4-021"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-021");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT10-056");
  });

  it("redirects an opponent attack only when the inherited host is exactly GreyKnightsmon", async () => {
    const valid = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-021", as: "greyKnights", under: ["EX4-047"] }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    valid.state.turnSeat = 1;
    await valid.ready();
    expect(
      valid.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: valid.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        valid.events.some(
          (event) =>
            event.kind === "attackDeclared" &&
            event.target.kind === "permanent" &&
            event.target.permanentId === valid.perm("greyKnights").permanentId,
        ) && valid.state.pendingDecision === null,
    );
    const redirected = valid.events.find(
      (event) => event.kind === "attackDeclared" && event.target.kind === "permanent",
    );
    expect(redirected).toMatchObject({ kind: "attackDeclared", target: { kind: "permanent" } });

    const invalid = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "plain", under: ["EX4-047"] }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    invalid.state.turnSeat = 1;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: invalid.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => invalid.events.some((event) => event.kind === "attackDeclared"));
    const notRedirected = invalid.events.find((event) => event.kind === "attackDeclared");
    expect(notRedirected).toMatchObject({ kind: "attackDeclared", target: { kind: "player" } });
  });
  ex4CardBehaviorTests("EX4-047");
});
