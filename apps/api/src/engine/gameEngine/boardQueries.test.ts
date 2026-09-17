import { describe, expect, it } from "vitest";
import { parseLinkCategory } from "./boardQueries.js";

/**
 * The §17-1-3-2-6/§17-1-3-2-7 rule check re-reads a linked card's printed `[Link]` header on
 * every sweep, and the printed header is the only source of truth for ~70 auto-generated link
 * cards (see the parser's own doc comment). A shape this parser stops recognizing silently
 * becomes a requirement that can never be violated, so each printed form is pinned here.
 *
 * FAILS-WHEN-REVERTED: loosen any of the four anchors (for example, let the name pattern run
 * before the trait pattern) and a "trait" header parses as a name — the trait case goes RED.
 */
describe("parseLinkCategory — the four printed [Link] headers", () => {
  it("reads a trait requirement", () => {
    expect(parseLinkCategory("[Link] [Appmon] trait: Cost 1")).toEqual({ tokens: ["Appmon"], match: "trait" });
  });

  it("reads an in-text requirement as the name/trait/text union", () => {
    expect(parseLinkCategory("[Link] [Gatchmon] in text: Cost 2")).toEqual({ tokens: ["Gatchmon"], match: "text" });
  });

  it("reads a bare bracketed requirement as a name", () => {
    expect(parseLinkCategory("[Link] [Gatchmon]: Cost 0")).toEqual({ tokens: ["Gatchmon"], match: "name" });
  });

  it("reads a level floor", () => {
    expect(parseLinkCategory("[Link] Lv.4 or higher: Cost 3")).toEqual({ minLevel: 4 });
  });

  it("returns undefined for a shape it does not recognize, inventing no gate", () => {
    expect(parseLinkCategory("[Link] something else entirely")).toBeUndefined();
    expect(parseLinkCategory("-")).toBeUndefined();
  });
});
