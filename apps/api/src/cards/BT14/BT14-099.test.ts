import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-099.js";

describe("BT14-099", () => {
  it("trashes three deck cards and grants Devimon Security Attack +1", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "TrashTopDeck", controller: "mine", amount: 3 });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" });
  });
  it("activates main in security", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }));
});
