import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-038.js";

describe("BT14-038", () => {
  it("preserves Etemon's catalog, alternate evolution, and exact IR", () => {
    expect(getCardDefinition("BT14-038")).toMatchObject({
      nameEn: "Etemon", colors: ["Yellow"], level: 5, playCost: 7, dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 4 }],
      forms: ["Ultimate"], attributes: ["Virus"], types: ["Puppet"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [], digivolutionRequirement: [{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      condition: { kind: "youHave", count: 3 },
      target: { filter: { levels: [6], nameOrTrait: [{ tokens: ["Etemon"], match: "name" }] } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion" && !entry.isInherited)).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion" && !entry.isInherited)?.actions[0]).not.toHaveProperty("source");
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["trash"] }],
    });
  });

  it("Q2413 plays the eligible level-six Etemon before the public security battle", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT14-038", as: "securityEtemon" }],
          hand: [{ card: "BT11-044", as: "handEtemon" }],
          trash: [{ card: "BT14-034" }, { card: "BT14-034" }, { card: "BT14-034" }],
        },
        1: { battleArea: [{ card: "BT14-026", as: "attacker", dp: 8000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-044"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT11-044")).toBe(true);
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT11-044");
    const checked = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(played).toBeGreaterThanOrEqual(0);
    expect(played).toBeLessThan(checked);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-026")).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses the Sukamon alternate evolution cost and places itself at security bottom on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-034", as: "base" }], hand: [{ card: "BT14-038", as: "etemon" }], security: ["BT1-001"] },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("etemon").instanceId, useAlternateCost: true })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-038");
    expect(s.state.memory).toBe(2);
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === "BT14-038");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT14-038"]);
    assertNoLoudGap(s);
  });

  it("inherits placing an Etemon from trash at security bottom when its host is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-040", as: "host", under: ["BT14-034", "BT14-038"] }], trash: [{ card: "BT11-044", as: "trashedEtemon" }], security: ["BT1-001"] },
    }, { autoSelectCards: true });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.at(-1)?.cardId === "BT11-044");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-001", "BT11-044"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-040");
    assertNoLoudGap(s);
  });
});
