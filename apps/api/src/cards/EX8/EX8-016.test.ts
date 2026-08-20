import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-016.js";

describe("EX8-016", () => {
  it("has Security Attack +1 and Fortitude, and deletes the lowest-DP suspended opposing Digimon after suspending one", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }, { keyword: "Fortitude", raw: "＜Fortitude＞" }]));
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Suspend", optional: true }, { kind: "Delete", optional: true, target: { filter: { suspended: true, superlative: "lowestDP" } } }]);
  });
  it("restricts opposing attacks to suspended Digimon while this Digimon is suspended", () => expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "effect", condition: { kind: "selfIsSuspended" } }));
  it("exposes Security Attack +1 and Fortitude on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-016", as: "dinomon", suspended: true }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("dinomon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("dinomon"), "Fortitude")).toBe(true);
  });
});
