// @vitest-environment jsdom
import type { OpenBug, OpenBugDetail } from "@aegis/shared/feedback/OpenBug";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { OpenBugsPanel } from "./OpenBugsPanel";

const bug: OpenBug = {
  id: 7,
  summary: "Dianamon skips the DNA prompt",
  description: "It digivolved without asking.",
  cardIds: ["BT25-028"],
  status: "new",
  createdAt: Date.UTC(2026, 10, 20),
  volunteerNames: [],
  claimedByMe: false,
  noteCount: 0,
};
const detail: OpenBugDetail = { ...bug, notes: [] };

function mockApi(handler: (url: string, init?: RequestInit) => [number, unknown]) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const [status, body] = handler(String(input), init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(signedIn = true) {
  const onSignIn = vi.fn<() => void>();
  render(
    <I18nProvider>
      <OpenBugsPanel signedIn={signedIn} onSignIn={onSignIn} />
    </I18nProvider>,
  );
  return onSignIn;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("OpenBugsPanel", () => {
  it("asks guests to sign in before volunteering", () => {
    const fetchMock = mockApi(() => [200, {}]);
    const onSignIn = show(false);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("claims a bug and posts a note", async () => {
    const fetchMock = mockApi((url, init) => {
      if (url.endsWith("/open-bugs")) return [200, { items: [bug], nextBefore: null }];
      if (url.endsWith("/open-bugs/7/claim") && init?.method === "PUT")
        return [200, { ...detail, claimedByMe: true, volunteerNames: ["Mika"] }];
      if (url.endsWith("/open-bugs/7/notes"))
        return [
          200,
          {
            ...detail,
            claimedByMe: true,
            volunteerNames: ["Mika"],
            noteCount: 1,
            notes: [{ id: 1, authorName: "Mika", body: "Needs exactly four cards in trash.", createdAt: Date.now() }],
          },
        ];
      return [200, detail];
    });
    show();

    fireEvent.click(await screen.findByRole("button", { name: /Dianamon skips the DNA prompt/ }));
    fireEvent.click(await screen.findByRole("button", { name: "I'll investigate" }));
    expect(await screen.findByRole("button", { name: "Stop investigating" })).toBeTruthy();
    expect(screen.getAllByText("Investigating: Mika").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Add a note"), { target: { value: "Needs exactly four cards in trash." } });
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));

    expect(await screen.findByText("Needs exactly four cards in trash.", { selector: "p" })).toBeTruthy();
    expect(screen.getByText("Notes: 1", { exact: false })).toBeTruthy();
    const noteCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/notes"));
    expect(JSON.parse(String(noteCall?.[1]?.body))).toEqual({ body: "Needs exactly four cards in trash." });
  });
});
