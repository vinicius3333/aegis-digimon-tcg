import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-046.js";

describe("EX4-046 WereGarurumon", () => {
  it("may digivolve another Digimon into a level six or lower Greymon from hand for two less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 2,
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

  it("redirects an opponent attack to the inherited host after suspending it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", dp: 10000, under: ["EX4-046"] }], security: ["BT1-001"] },
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
        0: { battleArea: [{ card: "BT1-010", as: "host", dp: 10000, under: ["EX4-046"] }], security: ["BT1-001"] },
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
  ex4CardBehaviorTests("EX4-046");
});
