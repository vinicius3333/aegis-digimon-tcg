import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-049.js";

describe("EX6-049 Diaboromon", () => {
  it("deletes a level 3 opponent Digimon when their hand has five or fewer cards and trashes their hand at seven or more", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 5 } }, { kind: "Trash", chooser: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } }]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } }] }));
});
