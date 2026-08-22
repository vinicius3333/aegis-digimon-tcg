import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-060.js";

describe("BT26-060 compiled fidelity", () => {
  it("encodes printed keywords, Succession, the deck-add delete watcher, and the explicit stacked-return seam", () => {
    const card = getCompiledCard("BT26-060");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["The per-target top-five stacked-card return across three opponent Digimon and chosen deck order has no executable multi-permanent IR action; both printed return clauses remain loud RawUnparsed."]);
    expect(card?.keywords?.map((keyword) => keyword.keyword)).toEqual(expect.arrayContaining(["SecurityAttack", "Reboot", "Blocker", "Succession"]));
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "RawUnparsed" }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "GrantStatic", grant: "effects", duration: "permanent" }]);
    expect(card?.effects?.[3]?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenEffectAddsToDeck", oncePerTurnKey: "BT26-060/delete-on-effect-adds-to-deck" }]);
  });
});
