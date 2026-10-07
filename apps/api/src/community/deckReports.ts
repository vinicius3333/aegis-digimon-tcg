import type { CommunityReportReason } from "@aegis/shared";
import { GITHUB_API, githubHeaders, neutralizeMarkdownRefs } from "../bugs/GitHubIssueTracker.js";

export const DECK_REPORT_LABEL = "deck-report";

const REASON_LABELS: Record<CommunityReportReason, string> = {
  offensive_name: "Offensive name",
  inappropriate_content: "Inappropriate content",
  spam: "Spam",
  other: "Other",
};

// GitHub caps a page at 100. Open deck reports are expected to stay far below that; past it, a
// second report on an older deck opens a new issue instead of commenting, which is still triaged.
const OPEN_ISSUES_PAGE = 100;

export type NewDeckReport = {
  deckId: string;
  deckName: string;
  authorName: string;
  reason: CommunityReportReason;
  details?: string;
};

/** Where a deck report goes. The route depends on this so a test can report without a network. */
export type DeckReportTracker = {
  report(report: NewDeckReport): Promise<void>;
};

export type GitHubDeckReportTrackerOptions = {
  /** `owner/repo` — the repository the issues land in. */
  repository: string;
  token: string;
  /** Origin of the web client, for the link a moderator follows to the deck. */
  webUrl: string;
  fetch?: typeof globalThis.fetch;
};

/**
 * Files community deck reports as GitHub issues labelled `deck-report`, one issue per deck: a later
 * report on the same deck becomes a comment, so the comment count is the report count.
 *
 * The repository is public. The issue never names the reporter, and the deck name and author sit
 * in code spans so they read as quoted data, not as a statement by the project.
 */
export class GitHubDeckReportTracker implements DeckReportTracker {
  private readonly fetch: typeof globalThis.fetch;

  constructor(private readonly options: GitHubDeckReportTrackerOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /** Shares the bug tracker's token and repository; undefined when the deployment has none. */
  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): GitHubDeckReportTracker | undefined {
    const token = env.GITHUB_TOKEN;
    const repository = env.GITHUB_BUG_REPOSITORY;
    if (!token || !repository) return undefined;
    return new GitHubDeckReportTracker({ repository, token, webUrl: env.AEGIS_WEB_URL ?? "http://localhost:5173" });
  }

  async report(report: NewDeckReport): Promise<void> {
    const existing = await this.openIssueFor(report.deckId);
    const repository = `${GITHUB_API}/repos/${this.options.repository}`;
    const [url, payload] =
      existing === undefined
        ? [
            `${repository}/issues`,
            {
              title: deckReportTitle(report),
              body: deckReportBody(report, this.options.webUrl),
              labels: [DECK_REPORT_LABEL],
            },
          ]
        : [`${repository}/issues/${existing}/comments`, { body: deckReportComment(report) }];
    const response = await this.fetch(url, {
      method: "POST",
      headers: githubHeaders(this.options.token),
      body: JSON.stringify(payload),
    });
    if (!response.ok)
      throw new Error(
        `GitHub refused the deck report: ${response.status} ${await response.text().catch(() => "")}`.trim(),
      );
  }

  private async openIssueFor(deckId: string): Promise<number | undefined> {
    const response = await this.fetch(
      `${GITHUB_API}/repos/${this.options.repository}/issues?labels=${DECK_REPORT_LABEL}&state=open&per_page=${OPEN_ISSUES_PAGE}`,
      { headers: githubHeaders(this.options.token) },
    );
    if (!response.ok) throw new Error(`GitHub refused to list deck reports: ${response.status}`);
    const issues = (await response.json()) as { number: number; body: string | null }[];
    return issues.find((issue) => issue.body?.startsWith(deckMarker(deckId)))?.number;
  }
}

/** Short and free of player text, so the public issue list does not repeat an offensive name. */
export function deckReportTitle({ deckId }: NewDeckReport): string {
  return `Community deck report · ${deckId.slice(0, 8)}`;
}

export function deckReportBody(report: NewDeckReport, webUrl: string): string {
  return [
    deckMarker(report.deckId),
    `**Deck:** \`${inlineCode(report.deckName)}\` by \`${inlineCode(report.authorName)}\``,
    `**Link:** ${webUrl.replace(/\/$/, "")}/community/decks/${report.deckId}`,
    "",
    "### Reports",
    deckReportComment(report),
    "",
    "---",
    "Each later report on this deck is added as a comment. Open the link signed in as an admin to hide or restore the deck.",
  ].join("\n");
}

export function deckReportComment({ reason, details }: NewDeckReport): string {
  const quoted = details ? `\n\n${quote(neutralizeMarkdownRefs(escapeHtml(details)))}` : "";
  return `**${REASON_LABELS[reason]}**${quoted}`;
}

// Hidden in the rendered issue; how a later report finds the issue this deck already has.
function deckMarker(deckId: string): string {
  return `<!-- aegis-deck:${deckId} -->`;
}

// A reporter could otherwise plant another deck's marker and steer that deck's reports here.
function escapeHtml(text: string): string {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

/** Strips the one character that could break out of the code span this value is rendered inside. */
function inlineCode(value: string): string {
  return value.replace(/`/g, "");
}
