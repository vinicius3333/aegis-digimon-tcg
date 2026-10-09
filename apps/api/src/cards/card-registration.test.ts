import { allCards, isTokenDefinition } from "@aegis/shared";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../engine/effects/interpreter.js";
import "./index.js";

const cardsDirectory = fileURLToPath(new URL(".", import.meta.url));

describe("card registration", () => {
  it("registers compiled IR for every printed catalog card", () => {
    const missing = allCards()
      .filter((card) => !isTokenDefinition(card))
      .map(({ cardId }) => cardId)
      .filter((cardId) => !hasRegisteredCompiledCard(cardId));

    expect(missing).toEqual([]);
  });

  it("keeps legacy registerCard out of card modules", () => {
    const legacy = globSync("*/*.ts", { cwd: cardsDirectory })
      .filter((path) => !path.endsWith(".test.ts"))
      .filter((path) => /\bregisterCard\s*\(/.test(readFileSync(`${cardsDirectory}/${path}`, "utf8")));

    expect(legacy).toEqual([]);
  });
});
