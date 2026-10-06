import { describe, expect, it } from "vitest";
import { roomCodeFromSearch, roomInviteUrl, spectatorCodeFromSearch, spectatorInviteUrl } from "./roomInvite";

describe("room invite links", () => {
  it("builds a lobby link carrying the code", () => {
    expect(roomInviteUrl("ab12cd", "https://aegis.example")).toBe("https://aegis.example/play?room=AB12CD");
  });

  it("reads the code back from the link and rejects junk", () => {
    expect(roomCodeFromSearch("?room=ab12cd")).toBe("AB12CD");
    expect(roomCodeFromSearch("?room=")).toBeUndefined();
    expect(roomCodeFromSearch("?room=not%20a%20code")).toBeUndefined();
    expect(roomCodeFromSearch("")).toBeUndefined();
  });
});

it("shares observer links separately from player invitations", () => {
  const url = spectatorInviteUrl("abcdef", "https://aegis.example");
  expect(url).toBe("https://aegis.example/play?watch=ABCDEF");
  expect(spectatorCodeFromSearch(new URL(url).search)).toBe("ABCDEF");
  expect(roomCodeFromSearch(new URL(url).search)).toBeUndefined();
  expect(spectatorCodeFromSearch("?watch=short")).toBeUndefined();
  expect(spectatorCodeFromSearch("?watch=ABCDEF<script>")).toBeUndefined();
});
