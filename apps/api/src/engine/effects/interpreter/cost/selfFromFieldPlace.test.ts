import { describe, expect, it } from "vitest";
import type { Cost } from "@aegis/shared";
import { setupEngine } from "../../../testkit/harness.js";
import { buildEffectContext, cardSourceOf } from "../../../gameEngine/effectContext.js";
import { canPayCost } from "./canPay.js";
import { payPlaceCost } from "./place.js";
import "../../../../cards/index.js";

/**
 * "By placing this card from the battle area face down under any of your [DATA SQUAD] trait
 * Tamers" (ST24-15, ST23-15). Some records compile this cost WITHOUT the permanent-placement
 * fields, leaving only `from: ["field"]` on a self-referencing target. That shape used to fall
 * into the loose-card scan, which finds nothing in hand or trash and silently hid the whole
 * clause. KB Q6232 puts the placed card at the bottom of the cards under the Tamer.
 */
const bareSelfFromFieldCost = (): Cost => ({
  kind: "place",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true, from: ["field"] },
  raw: "By placing this card from the battle area face down under any of your [DATA SQUAD] trait Tamers",
  underFilter: {
    controller: "mine",
    kind: ["Tamer"],
    nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
  },
  faceDown: true,
});

const board = (tamer: string) =>
  setupEngine(
    {
      0: {
        battleArea: [...(tamer === "none" ? [] : [{ card: tamer, as: "tamer" }]), { card: "ST24-15", as: "option" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );

const contextFor = async (s: ReturnType<typeof board>) => {
  await s.ready();
  const source = cardSourceOf(s.engine as never, s.perm("option").topCard!);
  return buildEffectContext(s.engine as never, source, { effectKey: "test" } as never, {} as never);
};

describe("place cost paid with the source permanent itself", () => {
  it("is payable while the source is in the battle area and a legal host exists", async () => {
    const s = board("BT26-094");
    expect(canPayCost(await contextFor(s), bareSelfFromFieldCost())).toBe(true);
  });

  it("is unpayable with no matching host", async () => {
    const s = board("none");
    expect(canPayCost(await contextFor(s), bareSelfFromFieldCost())).toBe(false);
  });

  it("moves the source under the host, face down, at the bottom of the stack", async () => {
    const s = board("BT26-094");
    const ctx = await contextFor(s);
    const optionInstanceId = s.perm("option").topCard!.instanceId;
    const tamerPermanentId = s.perm("tamer").permanentId;

    expect(await payPlaceCost(ctx, bareSelfFromFieldCost())).toBe(true);

    const tamer = s.state.players[0]!.battleArea.find((p) => p.permanentId === tamerPermanentId)!;
    expect(tamer.stack.map((card) => card.instanceId)).toEqual([optionInstanceId]);
    expect(tamer.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST24-15")).toBe(false);
  });
});
