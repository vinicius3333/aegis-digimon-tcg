import { describe, expect, it } from "vitest";
import type { Action } from "@aegis/shared";
import { setupEngine, type SeatSpec } from "../../../testkit/harness.js";
import { buildEffectContext, cardSourceOf } from "../../../gameEngine/effectContext.js";
import { canDetachPermanentTop, onlyInfeasibleDetachTop } from "./detachTop.js";
import "../../../../cards/index.js";

type SecurityManipulation = Extract<Action, { kind: "SecurityManipulation" }>;

const detachSelf: SecurityManipulation = {
  kind: "SecurityManipulation",
  op: "addBottom",
  controller: "mine",
  source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  faceUp: true,
  detachPermanentTop: true,
};

const detachOpponent: SecurityManipulation = {
  kind: "SecurityManipulation",
  op: "placeAsSecurity",
  controller: "opponent",
  source: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  toTop: true,
  detachPermanentTop: true,
};

async function contextFor(mine: SeatSpec, opponent: SeatSpec = {}) {
  const s = setupEngine({ 0: mine, 1: opponent });
  await s.ready();
  const source = cardSourceOf(s.engine as never, s.perm("source").topCard!);
  return buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
}

describe("detach-top feasibility (BT9-044 Q1840, BT17-098 Q2892, EX13-032 Q7307)", () => {
  it("refuses a source Digimon with no digivolution cards", async () => {
    const ctx = await contextFor({ battleArea: [{ card: "BT20-055", as: "source" }] });
    expect(canDetachPermanentTop(ctx, detachSelf)).toBe(false);
    expect(onlyInfeasibleDetachTop(ctx, [detachSelf])).toBe(true);
  });

  it("accepts a source Digimon with digivolution cards", async () => {
    const ctx = await contextFor({ battleArea: [{ card: "BT20-055", as: "source", under: ["BT20-054"] }] });
    expect(canDetachPermanentTop(ctx, detachSelf)).toBe(true);
    expect(onlyInfeasibleDetachTop(ctx, [detachSelf])).toBe(false);
  });

  it("needs a targeted Digimon with digivolution cards", async () => {
    const bare = await contextFor({ battleArea: [{ card: "BT16-056", as: "source" }] }, { battleArea: ["BT1-015"] });
    expect(canDetachPermanentTop(bare, detachOpponent)).toBe(false);

    const stacked = await contextFor(
      { battleArea: [{ card: "BT16-056", as: "source" }] },
      { battleArea: ["BT1-015", { card: "BT1-015", under: ["BT1-009"] }] },
    );
    expect(canDetachPermanentTop(stacked, detachOpponent)).toBe(true);
  });

  it("does not treat other actions as infeasible detach-top actions", async () => {
    const ctx = await contextFor({ battleArea: [{ card: "BT20-055", as: "source" }] });
    const draw: Action = { kind: "Draw", amount: 1 } as Action;
    expect(onlyInfeasibleDetachTop(ctx, [detachSelf, draw])).toBe(false);
    expect(onlyInfeasibleDetachTop(ctx, [])).toBe(false);
  });
});
