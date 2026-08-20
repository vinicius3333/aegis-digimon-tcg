import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-051.js";

describe("EX6-051 DanDevimon", () => {
  it("deletes a level 4 or lower opposing Digimon at five or fewer hand cards and trashes your hand card at seven or more", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 5 } }, { kind: "Trash", condition: { kind: "zoneCount", op: "gte", value: 7 } }]));
  it("revives DanDevimon from trash at ten opposing trash cards and inherits the opponent-hand fallback", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, condition: { kind: "zoneCount", zone: "trash", op: "gte", value: 10 } });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Trash", controller: "opponent" }, { kind: "PlayWithoutCost", from: ["trash"], condition: { kind: "ifThisEffectDidNotAct" } }] });
  });
});
