import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allCardIds, cardImageUrls, getCardArts } from "@aegis/shared";
import { describe, expect, it } from "vitest";

const unpublishedDir = join(dirname(fileURLToPath(import.meta.url)), "../../public/cards/unpublished");

describe("unpublished card art", () => {
  it("ships exactly the files the card catalog references", () => {
    const referenced = new Set(
      allCardIds().flatMap((cardId) =>
        getCardArts(cardId).flatMap(({ artId }) =>
          cardImageUrls(cardId, artId)
            .filter((url) => url.startsWith("/cards/unpublished/"))
            .map((url) => url.split("/").at(-1)),
        ),
      ),
    );
    const bundled = readdirSync(unpublishedDir).filter((name) => name.endsWith(".webp"));

    expect([...referenced].sort()).toEqual(bundled.sort());
  });
});
