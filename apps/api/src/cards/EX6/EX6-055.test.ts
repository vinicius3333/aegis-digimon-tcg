import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-055.js";

describe("EX6-055 BeelStarmon", () => {
  it("deletes an opposing level 5 or lower Digimon, or trashes one of their hand cards if no deletion occurs", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }, { kind: "Trash", condition: { kind: "ifThisEffectDidNotAct" } }]));
  it("grants Rush and Security Attack +1 while the opponent has five or fewer hand cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Rush" } }, while: { kind: "zoneCount", op: "lte", value: 5 } }, { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "zoneCount", op: "lte", value: 5 } }]));
});
