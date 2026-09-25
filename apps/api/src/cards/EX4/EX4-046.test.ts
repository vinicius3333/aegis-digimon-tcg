import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-046.js";

describe("EX4-046 WereGarurumon", () => {
  it("may digivolve another Digimon into a level six or lower Greymon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costDelta: -2,
      optional: true,
      target: { filter: { controller: "mine", excludeSelf: true } },
      into: {
        filter: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Greymon"] }] },
      },
    });
  });
  it("can suspend itself to redirect an opponent attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              abortOnDecline: true,
              cost: { kind: "suspend", optional: true, target: { filter: { isSelfRef: true } } },
            },
          ],
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-046");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves another own Digimon into Greymon from hand for two less", async () => {
    const positive = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-046", as: "source" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "AD1-001", as: "greymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    positive.state.memory = 10;
    await positive.ready();
    await advance(positive.engine).fire(EffectTiming.WhenDigivolving, positive.perm("source"));
    await settle(() => positive.perm("other").topCard?.cardId === "AD1-001");
    expect(positive.perm("other").topCard?.cardId).toBe("AD1-001");
    expect(positive.state.memory).toBe(10);

    const negative = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-046", as: "source" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "BT1-036", as: "wrongName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await negative.ready();
    await advance(negative.engine).fire(EffectTiming.WhenDigivolving, negative.perm("source"));
    await settle();
    expect(negative.perm("other").topCard?.cardId).toBe("BT1-010");
    expect(negative.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      negative.inst("wrongName").instanceId,
    );
  });

  it("accepts the level-6 Greymon boundary and pays its printed cost minus two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-046", as: "source" },
            { card: "EX4-009", as: "other" },
          ],
          hand: [{ card: "EX4-012", as: "levelSixGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("other").topCard?.cardId === "EX4-012");

    expect(s.perm("other").topCard?.cardId).toBe("EX4-012");
    expect(s.state.memory).toBe(8);
  });

  it("resolves the secondary Greymon evolution after legally digivolving the source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "sourceBase" },
            { card: "EX4-009", as: "otherBase" },
          ],
          hand: [
            { card: "EX4-046", as: "sourceEvolution" },
            { card: "EX4-012", as: "greymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sourceBase").permanentId,
        instanceId: s.inst("sourceEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("sourceBase").topCard?.cardId === "EX4-046" && s.perm("otherBase").topCard?.cardId === "EX4-012",
    );
    expect(s.perm("sourceBase").stack.map((card) => card.cardId)).toEqual(["EX4-043"]);
    expect(s.perm("sourceBase").topCard?.cardId).toBe("EX4-046");
    expect(s.perm("otherBase").stack.map((card) => card.cardId)).toEqual(["EX4-009"]);
    expect(s.perm("otherBase").topCard?.cardId).toBe("EX4-012");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("greymon").instanceId);
  });

  it("does not evolve the other Digimon when hand candidates fail the name or level boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "sourceBase" },
            { card: "EX4-009", as: "otherBase" },
          ],
          hand: [
            { card: "EX4-046", as: "sourceEvolution" },
            { card: "BT1-036", as: "wrongName" },
            { card: "BT13-020", as: "levelSevenGreymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sourceBase").permanentId,
        instanceId: s.inst("sourceEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourceBase").topCard?.cardId === "EX4-046");
    expect(s.perm("sourceBase").topCard?.cardId).toBe("EX4-046");
    expect(s.perm("otherBase").topCard?.cardId).toBe("EX4-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongName").instanceId, s.inst("levelSevenGreymon").instanceId]),
    );
    expect(s.state.memory).toBe(7);
  });

  it("publicly declines the secondary evolution after a legal source digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-043", as: "sourceBase" },
            { card: "EX4-009", as: "otherBase" },
          ],
          hand: [
            { card: "EX4-046", as: "sourceEvolution" },
            { card: "EX4-012", as: "greymon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sourceBase").permanentId,
        instanceId: s.inst("sourceEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourceBase").topCard?.cardId === "EX4-046");
    expect(s.perm("sourceBase").stack.map((card) => card.cardId)).toEqual(["EX4-043"]);
    expect(s.perm("sourceBase").topCard?.cardId).toBe("EX4-046");
    expect(s.perm("otherBase").stack.map((card) => card.cardId)).toEqual([]);
    expect(s.perm("otherBase").topCard?.cardId).toBe("EX4-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);
    expect(s.state.memory).toBe(7);
  });

  it("allows declining the optional digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-046", as: "source" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "AD1-001", as: "greymon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();

    expect(s.perm("other").topCard?.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);
    expect(s.state.memory).toBe(10);
  });

  it("redirects an opponent attack to the inherited host after suspending it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", dp: 10000, under: ["EX4-046"] }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.target.kind === "permanent" &&
          event.target.permanentId === s.perm("host").permanentId,
      ),
    );
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("leaves an opponent attack aimed at the player when the optional redirect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", dp: 10000, under: ["EX4-046"] }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));
    const attack = s.events.find((event) => event.kind === "attackDeclared");
    expect(attack).toMatchObject({ kind: "attackDeclared", target: { kind: "player" } });
    expect(s.perm("host").isSuspended).toBe(false);
  });
  it("has a printed ＜Blocker＞ on its main side", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-046", as: "host" }] }, 1: {} });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
  ex4CardBehaviorTests("EX4-046");
});
