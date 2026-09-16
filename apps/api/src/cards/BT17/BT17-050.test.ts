import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-050.js";
import "./index.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT17-050/"),
  );
  if (effect === undefined) throw new Error("BT17-050 surfaces no [Hand][Main] effect");
  return effect.effectKey;
}

describe("BT17-050 Parasitemon", () => {
  it("matches the catalog identity and printed evolution route", () => {
    expect(getCardDefinition("BT17-050")).toMatchObject({
      cardId: "BT17-050",
      nameEn: "Parasitemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 9,
      dp: 4000,
      types: ["Parasite"],
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
    });
    const printed = getCardDefinition("BT17-050")!.effectText!;
    expect(printed).toContain("[Hand] [Main] By paying 4 cost and placing this card");
    expect(printed).toContain("＜Alliance＞");
    expect(printed).toContain("[End of Attack] You may place this Digimon as the bottom digivolution card");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("carries the modal [Hand][Main], the [End of Attack] relocate and both inherited effects", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({
      isFromHand: true,
      actions: [
        {
          kind: "Modal",
          choose: 1,
          payCostBeforeOptional: true,
          cost: {
            kind: "compound",
            costs: [
              { kind: "payMemory", memory: 4 },
              {
                kind: "place",
                underFilter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
                position: "bottom",
                bindHostAs: "parasitemonHost",
              },
            ],
          },
        },
      ],
    });
    const option = irNode(main!.actions[0]!).options[0];
    expect(option).toHaveLength(2);
    expect(option[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent" }, count: 1 } });
    expect(option[1]).toMatchObject({ kind: "Attack", attacker: { filter: { boundRef: "parasitemonHost" } } });
    expect(irNode(main!.actions[0]!).options[1]).toEqual([]);

    expect(compiled.effects.find((entry) => entry.trigger === "EndOfAttack")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      underFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
      optional: true,
    });
    expect(compiled.effects.filter((entry) => entry.isInherited).map((entry) => entry.trigger)).toEqual([
      "AllTurns",
      "YourTurn",
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      leaveCause: "byOpponentEffect",
    });
  });

  it("naturally pays 4 from hand, places itself as the bottom card, suspends and attacks with the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-048", as: "host", under: [{ card: "BT1-011", as: "hostSource" }] }],
          hand: [
            { card: "BT17-050", as: "parasitemon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [{ card: "BT1-011", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 5000, as: "prey", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();
    const parasitemonId = s.inst("parasitemon").instanceId;
    const preyId = s.perm("prey").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: parasitemonId,
        effectKey: handMainEffectKey(s, s.inst("parasitemon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== preyId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      parasitemonId,
      s.inst("hostSource").instanceId,
    ]);
    expect(s.perm("host").currentDP).toBe(10000);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-013");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q2803: refuses to activate with no level-5-or-higher host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "lv4" }],
          hand: [
            { card: "BT17-050", as: "parasitemon" },
            { card: "BT1-010", as: "spare" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "prey", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const parasitemonId = s.inst("parasitemon").instanceId;

    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: parasitemonId,
      effectKey: handMainEffectKey(s, s.inst("parasitemon")),
    });
    await settle(() => s.state.pendingDecision === undefined && observe(s.engine).isAttacking() === false);

    expect(result).not.toEqual({ ok: true });
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(parasitemonId);
  });

  it("Q2804: can place under a level-5 host without suspending or attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-048", as: "host" }],
          hand: [
            { card: "BT17-050", as: "parasitemon" },
            { card: "BT1-010", as: "spare" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 4;
    await s.ready();
    const parasitemonId = s.inst("parasitemon").instanceId;
    const preyId = s.perm("prey").permanentId;

    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: parasitemonId,
      effectKey: handMainEffectKey(s, s.inst("parasitemon")),
    });
    await settle(() => s.perm("host").stack.some(({ instanceId }) => instanceId === parasitemonId));

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([parasitemonId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === preyId)?.isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("[End of Attack]: after Parasitemon attacks, it relocates as the bottom card of another Digimon, trashing its own source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-050", as: "para", under: [{ card: "BT1-011", as: "paraSource" }] },
            { card: "BT17-048", as: "other" },
          ],
        },
        1: { security: [{ card: "BT1-010", as: "sec" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const paraId = s.inst("para").instanceId;
    const otherId = s.perm("other").permanentId;
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("para").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: undefined })).toEqual({ ok: true });
    await settle(() => s.perm("other").stack.some(({ instanceId }) => instanceId === paraId));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([otherId]);
    expect(s.perm("other").stack.map(({ cardId }) => cardId)).toEqual(["BT17-050"]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("paraSource").instanceId)).toBe(
      true,
    );
    expect(s.perm("other").currentDP).toBe(10000);
  });

  it("Q2805: an opponent effect deleting the host lets each buried Parasitemon play itself for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT17-048",
              as: "host",
              under: [
                { card: "BT17-050", as: "buriedOne" },
                { card: "BT17-050", as: "buriedTwo" },
              ],
            },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostPermanentId = s.perm("host").permanentId;

    advance(s.engine).verb.enterEffectResolution(1);
    await advance(s.engine).verb.deletePermanent([hostPermanentId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT17-050").length === 2);

    const parasitemons = s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT17-050");
    expect(parasitemons.map((p) => p.topCard!.instanceId).sort()).toEqual(
      [s.inst("buriedOne").instanceId, s.inst("buriedTwo").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT17-048")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostPermanentId)).toBe(false);
  });

  it("[Your Turn] inherited: confers +3000 DP only while Parasitemon sits under a host on your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-048", as: "boosted", under: ["BT17-050"] },
          { card: "BT17-048", as: "bare" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("bare").currentDP).toBe(7000);
    expect(s.perm("boosted").currentDP).toBe(10000);
  });
});
