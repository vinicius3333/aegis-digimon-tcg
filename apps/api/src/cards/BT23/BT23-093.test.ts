import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-093.js";

describe("BT23-093 Big Bang Punch", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-093")).toMatchObject({
      cardId: "BT23-093",
      nameEn: "Big Bang Punch!",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Appmon"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toEqual(["battleArea", "breedingArea"]);
  });

  it("pays intrinsic Delay and links only a Link-capable Appmon to the suspending subject", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-093", as: "option" },
            { card: "BT22-016", as: "recipient" },
          ],
          hand: [
            { card: "BT21-009", as: "eligible" },
            { card: "BT22-016", as: "noLink" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const eligibleId = s.inst("eligible").instanceId;
    const invalidId = s.inst("noLink").instanceId;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("recipient").permanentId,
    });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("recipient").linked.some((card) => card.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === invalidId)).toBe(true);
  });

  it("links an Appmon card from hand to the suspending Appmon Digimon", () => {
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    const link = delay.actions[0].actions[0];
    expect(link).toMatchObject({ kind: "Link", from: ["hand"], optional: true });
    expect(link.target.filter.nameOrTrait).toEqual([{ tokens: ["Appmon"], match: "trait" }]);
    expect(link.recipient).toEqual({ filter: { isTriggerSource: true }, count: 1 });
    expect(link.linkCardFilter).toBeUndefined();
  });
});
