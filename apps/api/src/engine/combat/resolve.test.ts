import { describe, it, expect } from "vitest";
import {
  compareDP,
  resolvePermanentBattle,
  resolveSecurityBattle,
} from "./resolve.js";

describe("compareDP (IBattle.CompareStats)", () => {
  it("attacker with higher DP wins", () => {
    expect(compareDP(7000, 5000)).toBe("attackerWins");
  });

  it("attacker with lower DP loses", () => {
    expect(compareDP(3000, 5000)).toBe("defenderWins");
  });

  it("equal DP is a tie", () => {
    expect(compareDP(5000, 5000)).toBe("tie");
  });

  it("treats the difference, not the magnitude (clamp to -1/0/1 semantics)", () => {
    // A 1-DP edge wins exactly like a 10000-DP edge.
    expect(compareDP(5001, 5000)).toBe("attackerWins");
    expect(compareDP(15000, 5000)).toBe("attackerWins");
  });
});

describe("resolvePermanentBattle (loser deleted, ties delete both)", () => {
  const ids = { attackerPermanentId: "A", defenderPermanentId: "D" };

  it("attacker wins: only the defender is deleted", () => {
    const outcome = resolvePermanentBattle({ ...ids, attackerDP: 9000, defenderDP: 4000 });
    expect(outcome.comparison).toBe("attackerWins");
    expect(outcome.deletedPermanentIds).toEqual(["D"]);
    expect(outcome.wasTie).toBe(false);
  });

  it("defender wins: only the attacker is deleted", () => {
    const outcome = resolvePermanentBattle({ ...ids, attackerDP: 2000, defenderDP: 6000 });
    expect(outcome.comparison).toBe("defenderWins");
    expect(outcome.deletedPermanentIds).toEqual(["A"]);
    expect(outcome.wasTie).toBe(false);
  });

  it("tie: BOTH permanents are deleted", () => {
    const outcome = resolvePermanentBattle({ ...ids, attackerDP: 5000, defenderDP: 5000 });
    expect(outcome.comparison).toBe("tie");
    expect(outcome.deletedPermanentIds).toEqual(["A", "D"]);
    expect(outcome.wasTie).toBe(true);
  });
});

describe("resolvePermanentBattle <Iceclad> (§16-35: compare digivolution-card counts instead of DP)", () => {
  const ids = { attackerPermanentId: "A", defenderPermanentId: "D" };

  it("DP-vs-count DISAGREEMENT: the Iceclad side wins on count despite losing on DP", () => {
    const outcome = resolvePermanentBattle({
      ...ids,
      attackerDP: 20000,
      defenderDP: 5000,
      defenderHasIceclad: true,
      attackerDigivolutionCount: 0,
      defenderDigivolutionCount: 3,
    });
    expect(outcome.comparison).toBe("defenderWins");
    expect(outcome.deletedPermanentIds).toEqual(["A"]);
  });

  it("NEGATIVE CONTROL: without Iceclad, DP alone decides even though counts disagree", () => {
    const outcome = resolvePermanentBattle({
      ...ids,
      attackerDP: 20000,
      defenderDP: 5000,
      attackerDigivolutionCount: 0,
      defenderDigivolutionCount: 3,
    });
    expect(outcome.comparison).toBe("attackerWins");
    expect(outcome.deletedPermanentIds).toEqual(["D"]);
  });

  it("equal digivolution-card counts is a tie (both lose), DP is ignored", () => {
    const outcome = resolvePermanentBattle({
      ...ids,
      attackerDP: 20000,
      defenderDP: 1000,
      attackerHasIceclad: true,
      attackerDigivolutionCount: 2,
      defenderDigivolutionCount: 2,
    });
    expect(outcome.comparison).toBe("tie");
    expect(outcome.deletedPermanentIds).toEqual(["A", "D"]);
  });
});

describe("resolvePermanentBattle beDeletedInBattle — a spared loser is removed from deletedPermanentIds", () => {
  const ids = { attackerPermanentId: "A", defenderPermanentId: "D" };

  it("a spared defender is NOT deleted, even though it lost the comparison", () => {
    const outcome = resolvePermanentBattle({
      ...ids,
      attackerDP: 9000,
      defenderDP: 4000,
      defenderSparedFromDeletion: true,
    });
    expect(outcome.comparison).toBe("attackerWins"); // sparing doesn't change WHO won
    expect(outcome.deletedPermanentIds).toEqual([]); // just whether the loser is actually deleted
  });

  it("a spared side on a tie is removed, but the other tie participant is still deleted", () => {
    const outcome = resolvePermanentBattle({
      ...ids,
      attackerDP: 5000,
      defenderDP: 5000,
      attackerSparedFromDeletion: true,
    });
    expect(outcome.wasTie).toBe(true); // comparison is still a tie
    expect(outcome.deletedPermanentIds).toEqual(["D"]); // only the non-spared side actually dies
  });

  it("NEGATIVE CONTROL: without sparing, the identical battle deletes the loser as usual", () => {
    const outcome = resolvePermanentBattle({ ...ids, attackerDP: 9000, defenderDP: 4000 });
    expect(outcome.deletedPermanentIds).toEqual(["D"]);
  });
});

describe("resolveSecurityBattle (attacker DP vs revealed security Digimon DP)", () => {
  const base = { attackerPermanentId: "A" };

  it("attacker DP strictly greater: security Digimon dies, attacker survives", () => {
    const outcome = resolveSecurityBattle({ ...base, attackerDP: 6000, securityCardDP: 3000 });
    expect(outcome).toEqual({ securityDigimonDeleted: true, attackerDeleted: false });
  });

  it("equal DP: tie deletes both (attacker also dies)", () => {
    const outcome = resolveSecurityBattle({ ...base, attackerDP: 5000, securityCardDP: 5000 });
    expect(outcome).toEqual({ securityDigimonDeleted: true, attackerDeleted: true });
  });

  it("attacker DP lower: attacker dies, security Digimon survives the battle", () => {
    const outcome = resolveSecurityBattle({ ...base, attackerDP: 2000, securityCardDP: 7000 });
    expect(outcome).toEqual({ securityDigimonDeleted: false, attackerDeleted: true });
  });
});
