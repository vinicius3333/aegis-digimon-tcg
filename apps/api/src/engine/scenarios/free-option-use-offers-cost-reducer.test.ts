import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";

const faceDown = (alias: string) => ({ card: "BT1-009", as: alias, faceUp: false });

async function useYakshaThroughCrowmon(acceptReducer: boolean) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT27-081", as: "crowmon" },
          {
            card: "BT1-085",
            as: "tamer",
            under: [faceDown("first"), faceDown("second"), faceDown("third"), faceDown("fourth")],
          },
        ],
        hand: [{ card: "BT27-101", as: "yaksha" }],
      },
      1: { hand: Array<string>(7).fill("BT1-009") },
    },
    {
      autoAcceptOptional: true,
      autoSelectCards: true,
      declineDigiXros: true,
      declinePrompts: acceptReducer ? [] : ["Trash bottom face down under tamer"],
    },
  );
  await s.ready();
  s.state.memory = 3;
  await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("crowmon"));
  return s;
}

describe("free option use offers its would-be-used cost reducer", () => {
  it("lets a free Silver-Winged Yaksha trash a Tamer's bottom face-down card without spending memory", async () => {
    const s = await useYakshaThroughCrowmon(true);

    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT27-101" && req.kind === "optional")).toBe(true);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("fourth").instanceId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT27-101");
    expect(s.state.memory).toBe(3);
  });

  it("keeps the Tamer's face-down cards when the reducer is declined", async () => {
    const s = await useYakshaThroughCrowmon(false);

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("third").instanceId,
      s.inst("fourth").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT27-101");
    expect(s.state.memory).toBe(3);
  });
});
