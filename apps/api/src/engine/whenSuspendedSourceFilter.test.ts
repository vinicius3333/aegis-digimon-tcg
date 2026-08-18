import { describe, it, expect } from "vitest";
import { getCompiledCard } from "@aegis/shared";
// Self-register every compiled-IR card module so getCompiledCard resolves real definitions.
import "../cards/index.js";

/**
 * Regression for the `whenSuspended` / `whenUnsuspended` SubTrigger source-filter drop.
 *
 * The prose compiler (the trigger normalization logic `subTriggerSourceFilter`) used to ignore the
 * subject phrase of a "When <X> becomes suspended" trigger, emitting `sourceFilter: undefined`.
 * The engine gates such a watcher on TriggerInfo.suspendedPermanentId via `subjectMatchesFilter`,
 * so a dropped filter made the effect fire on EVERY suspension instead of only the printed
 * subject ("an opponent's Digimon" / "one of your red or yellow Tamers").
 *
 * FAILS-WHEN-REVERTED: revert the `whenSuspended`/`whenUnsuspended` arm in
 * `subTriggerSourceFilter` and these cards recompile with no `sourceFilter` => RED.
 */

function findSubTrigger(card: string, event: string): Record<string, unknown> | undefined {
  const compiled = getCompiledCard(card);
  if (compiled === undefined) return undefined;
  let found: Record<string, unknown> | undefined;
  const visit = (a: unknown): void => {
    if (Array.isArray(a)) {
      for (const x of a) visit(x);
    } else if (a !== null && typeof a === "object") {
      const obj = a as Record<string, unknown>;
      if (obj.kind === "SubTrigger" && obj.event === event && found === undefined) {
        found = obj;
      }
      for (const v of Object.values(obj)) visit(v);
    }
  };
  visit(compiled.effects);
  return found;
}

describe("whenSuspended SubTrigger carries the printed subject as sourceFilter", () => {
  it("BT10-051 'an opponent's Digimon becomes suspended' restricts to controller:opponent Digimon", () => {
    const st = findSubTrigger("BT10-051", "whenSuspended");
    expect(st).toBeDefined();
    expect(st?.sourceFilter).toEqual({ controller: "opponent", kind: ["Digimon"] });
  });

  it("BT13-008 'one of your red or yellow Tamers becomes suspended' restricts to mine Tamers of those colors", () => {
    const st = findSubTrigger("BT13-008", "whenSuspended");
    expect(st).toBeDefined();
    const f = st?.sourceFilter as Record<string, unknown>;
    expect(f.controller).toBe("mine");
    expect(f.kind).toEqual(["Tamer"]);
    expect(f.colors).toEqual(expect.arrayContaining(["Red", "Yellow"]));
  });

  it("BT9-056 'an opponent's Digimon or Tamer becomes suspended' restricts to opponent Digimon|Tamer", () => {
    const st = findSubTrigger("BT9-056", "whenSuspended");
    expect(st).toBeDefined();
    const f = st?.sourceFilter as Record<string, unknown>;
    expect(f.controller).toBe("opponent");
    expect(f.kind).toEqual(expect.arrayContaining(["Digimon", "Tamer"]));
  });

  it.each(["P-093", "P-109", "P-150"])(
    "%s keeps a pure self-reference explicitly scoped to its host",
    (cardId) => {
      const st = findSubTrigger(cardId, "whenSuspended");
      expect(st).toBeDefined();
      expect(st?.sourceFilter).toEqual({ isSelfRef: true });
    },
  );
});
