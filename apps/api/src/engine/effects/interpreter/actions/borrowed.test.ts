import { expect, it } from "vitest";
import type { Action } from "@aegis/shared";
import { setupEngine } from "../../../testkit/harness.js";
import { internalsOf } from "../../../testkit/internals.js";
import { runActivateForeignEffect } from "./borrowed.js";
import "../../../../cards/index.js";

// Controlled shared-action comparisons isolate usage ownership from the copier's outer OPT.
it.each([
  { transferred: true, lenderSource: false, spent: true },
  { transferred: true, lenderSource: false, spent: false },
  { transferred: false, lenderSource: false, spent: true },
  { transferred: false, lenderSource: false, spent: false },
  { transferred: true, lenderSource: true, spent: true },
  { transferred: true, lenderSource: true, spent: false },
])(
  "borrowed OPT ownership transfer=$transferred lenderSource=$lenderSource spent=$spent",
  async ({ transferred, lenderSource, spent }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-054", as: "host", suspended: true },
            { card: "BT19-064", as: "lender", suspended: true },
            { card: "LM-058", as: "payment" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const engine = internalsOf(s.engine);
    const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("host").topCard), {});
    const source = s.perm("lender").topCard.instanceId;
    const key = "BT19-064/ir-shared-0";
    if (spent) ctx.usage!.register(source, key);
    const action: Extract<Action, { kind: "ActivateForeignEffect" }> = {
      kind: "ActivateForeignEffect",
      zone: "battleArea",
      fromTriggers: ["WhenDigivolving"],
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Justimon: Blitz Arm"], match: "nameExact" }],
      },
      count: 1,
      ...(transferred ? { asEffectOf: "this Digimon" } : {}),
      ...(lenderSource ? { useLenderAsSource: true } : {}),
    };
    await runActivateForeignEffect(ctx, action);
    const copied = transferred && !lenderSource;
    expect(ctx.usage!.count(source, key)).toBe(copied ? Number(spent) : 1);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toEqual(
      copied || !spent ? [s.inst("payment").instanceId] : [],
    );
    expect(s.perm("host").isSuspended).toBe(!copied);
    expect(s.perm("lender").isSuspended).toBe(copied || spent);
  },
);

it("resolves a DUAL digivolution card's Option-side [Main] from its borrowed [When Digivolving]", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT10-112", as: "host", under: [{ card: "BT27-016", as: "lender" }] },
          { card: "BT1-009", as: "payment" },
        ],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        battleArea: [
          { card: "BT1-060", as: "lowest" },
          { card: "BT1-080", as: "highest" },
        ],
        security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  await s.ready();
  const engine = internalsOf(s.engine);
  const ctx = engine.buildEffectContext(engine.cardSourceOf(s.perm("host").topCard), {});
  await runActivateForeignEffect(ctx, {
    kind: "ActivateForeignEffect",
    asEffectOf: "this Digimon",
    zone: "digivolutionCards",
    fromTriggers: ["WhenDigivolving"],
    filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Jesmon (X Antibody)"], match: "nameExact" }] },
    count: 1,
  });

  const opponent = s.state.players[1]!;
  expect(opponent.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([s.inst("highest").instanceId]);
  expect(opponent.security.map((card) => card.instanceId).at(-1)).toBe(s.inst("lowest").instanceId);
  expect(opponent.trash.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("payment").instanceId);
});
