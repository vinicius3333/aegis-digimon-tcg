import { describe, expect, it } from "vitest";
import { pathForRoute, routeFromPathname } from "./routes";

describe("application routes", () => {
  it.each([
    ["/", { screen: "home" }],
    ["/login", { screen: "login" }],
    ["/play", { screen: "lobby" }],
    ["/decks", { screen: "deck" }],
    ["/collection", { screen: "collection" }],
    ["/community", { screen: "community" }],
    ["/community/decks/abc-123", { screen: "community", communityDeckId: "abc-123" }],
    ["/settings", { screen: "settings" }],
    ["/whats-new", { screen: "releases" }],
  ])("parses %s", (pathname, expected) => {
    expect(routeFromPathname(pathname)).toEqual(expected);
  });

  it("round-trips a community deck path", () => {
    expect(pathForRoute({ screen: "community", communityDeckId: "abc-123" })).toBe("/community/decks/abc-123");
    expect(pathForRoute({ screen: "community" })).toBe("/community");
  });

  it("rejects unknown paths, tournaments included while the feature is hidden", () => {
    expect(routeFromPathname("/unknown")).toBeUndefined();
    expect(routeFromPathname("/tournaments")).toBeUndefined();
  });
});
