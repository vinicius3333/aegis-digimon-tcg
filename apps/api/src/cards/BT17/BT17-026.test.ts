import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-026.js";
import "./index.js";

describe("BT17-026", () => {
  it("digivolves a Koji Tamer by placing Lobomon and KendoGarurumon from trash for cost 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Koji Minamoto"], match: "name" }] },
            fromSelectionRef: "beowolfHost",
          },
          costOverride: 3,
          asLevel: 4,
          virtualBase: { level: 4, colors: ["Blue"] },
          additionalCosts: [{ kind: "place" }],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("returns a Hybrid card from its stack to suspend an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: { filter: { zone: "digivolutionCards", hostFilter: { sourceRef: "triggerSubject" } } },
          },
        },
      ],
    });
  });

  it("returns a level 4 or lower opponent as inherited when it has Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "hand", condition: { kind: "selfHasTrait" } }],
    });
  });

  it("returns an opposing level 4 Digimon when its Hybrid host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-023", as: "host", under: ["BT17-026"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("places both Hybrid materials under the same Koji and digivolves it for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT17-026", as: "beowolf" }],
          trash: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-023", as: "kendo" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const effect = JSON.parse(s.inst("beowolf").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(effect).toHaveLength(1);
    const lobomonId = s.inst("lobomon").instanceId;
    const kendoId = s.inst("kendo").instanceId;
    const kojiId = s.inst("koji").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("beowolf").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");

    expect(s.perm("koji").topCard?.cardId).toBe("BT17-026");
    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual([kendoId, lobomonId, kojiId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === lobomonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === kendoId)).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).activatableEffects(s.perm("koji"))).toEqual([]);
  });
});
