import { allCards, type CompiledCard } from "@aegis/shared";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../engine/effects/interpreter.js";
import "./P/index.js";
import "./LM/index.js";
import "./RB1/index.js";

const auditedCards = allCards().filter((card) => ["P", "LM", "RB1"].includes(card.set));
// registerIrCard replaces the in-memory shared record. Read the persisted artifact
// independently so registration cannot hide stale data shipped to the client.
const persistedEffects = JSON.parse(
  readFileSync(new URL("../../../../packages/shared/src/effects/effects.json", import.meta.url), "utf8"),
) as Record<string, CompiledCard>;

describe("Promo, LM and RB catalog/runtime parity", () => {
  it("covers all 338 audited catalog cards", () => {
    expect(auditedCards).toHaveLength(338);
  });

  it.each(auditedCards)("publishes the executable IR for $cardId in the shared catalog", ({ cardId }) => {
    const runtime = runtimeCompiledCard(cardId);
    expect(runtime).toBeDefined();
    expect(persistedEffects[cardId]).toEqual(runtime);
  });
});
