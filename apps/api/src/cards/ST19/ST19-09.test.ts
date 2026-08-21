import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-09.js";

describe("ST19-09 Pandamon", () => {
  it("plays a level 3 Puppet Digimon from hand without cost on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-09", as: "panda" }], hand: [{ card: "ST19-02", as: "puppet" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const primitives = (s.engine as unknown as { primitives: { deletePermanent(ids: string[]): Promise<number> } }).primitives;
    await primitives.deletePermanent([s.perm("panda").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-02"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-02")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("puppet").instanceId)).toBe(false);
  });

  it("matches the printed Blocker and deletion text", () => {
    expect(getCardDefinition("ST19-09")).toMatchObject({
      effectText: expect.stringContaining("＜Blocker＞"),
    });
  });
});
