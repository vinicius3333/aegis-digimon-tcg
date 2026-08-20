import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-091.js";

describe("BT16-091", () => {
  it("plays Aquilamon or Gatomon and DNA digivolves in the main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "DnaDigivolve", payCost: true, optional: true, bindResultAs: "bt16091DnaResult" });
  });

  it("grants Security Attack +1 and attacks with the DNA result", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn", optional: true });
    expect(compiled.effects?.[0]?.actions?.[3]).toMatchObject({ kind: "Attack", attackPlayer: true });
  });

  it("plays Hawkmon or Salamon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }, { kind: "AddToHandSelf" }] });
  });
});
