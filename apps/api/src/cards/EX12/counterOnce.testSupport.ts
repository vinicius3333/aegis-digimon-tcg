import { expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";

/**
 * Q: can a [Counter] effect be activated and then another one? A: no, only 1 [Counter]
 * effect can be activated during 1 attack.
 *
 * Seat 1 holds `counterCard` and a second Digimon with an eligible [Counter] effect. After
 * seat 1 activates `counterCard`'s [Counter], the other one can no longer be activated and
 * never resolves during that attack.
 */
export async function expectOnlyOneCounterPerAttack(counterCard: PermanentSpec, otherCounterCard: PermanentSpec) {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }], security: ["BT1-009"] },
      1: {
        battleArea: [
          { ...counterCard, as: "counter" },
          { ...otherCounterCard, as: "otherCounter" },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));

  const opened = s.events.find((event) => event.kind === "counterWindowOpened");
  if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
  const eligibleFor = (alias: string) =>
    opened.eligibleCounters.find(({ instanceId }) => instanceId === s.perm(alias).topCard.instanceId);
  const chosen = eligibleFor("counter");
  const other = eligibleFor("otherCounter");
  expect(chosen).toBeDefined();
  expect(other).toBeDefined();

  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: chosen!.instanceId,
      effectKey: chosen!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() =>
    s.events.some((event) => event.kind === "effectActivated" && event.sourceCardId === counterCard.card),
  );

  expect(
    s.engine.applyIntent(1, {
      type: "respondCounter",
      sourceInstanceId: other!.instanceId,
      effectKey: other!.effectKey,
    }).ok,
  ).toBe(false);
  await advance(s.engine).finishAttack();
  await settle(() => s.state.pendingDecision === undefined);

  expect(s.events.filter((event) => event.kind === "counterWindowOpened")).toHaveLength(1);
  expect(
    s.events.flatMap((event) => (event.kind === "effectActivated" && event.seat === 1 ? [event.sourceCardId] : [])),
  ).toEqual([counterCard.card]);
}
