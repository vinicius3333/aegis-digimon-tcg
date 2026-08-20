import { getCardDefinition } from "@aegis/shared";

export const MAX_BUG_REPORT_CARDS = 20;
export const MAX_BUG_REPORT_SUMMARY = 120;
export const MAX_BUG_REPORT_DESCRIPTION = 4000;
export const MAX_BUG_REPORT_OPPONENT_DECK = 120;

// A link lands in a public issue, so only the hosts a screenshot or a clip can actually live on are
// accepted. Anything else is a stranger's URL published under the project's name.
export const ALLOWED_LINK_HOSTS: readonly string[] = [
  "discord.com",
  "discordapp.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "ptb.discord.com",
  "canary.discord.com",
];

const GITHUB_API = "https://api.github.com";
const ISSUE_TITLE_LIMIT = 90;
// Enough to name the browser and its version; the rest of a user agent string is noise.
const USER_AGENT_LIMIT = 200;

/** What the reporter filled in, plus the context their client carried on its own. */
export type NewBugReport = {
  /** Absent when the reporter had no account; the issue then credits an anonymous player. */
  reporterName?: string;
  summary: string;
  cardIds: readonly string[];
  description: string;
  opponentDeck?: string;
  attachmentUrl?: string;
  clientRevision?: string;
  userAgent?: string;
};

/** What the reporter gets back: the issue their report became. */
export type FiledBugReport = { number: number; url: string };

/**
 * Where a bug report goes. The routes depend on this rather than on the GitHub client so a test can
 * file a report without a network or a token.
 */
export type IssueTracker = {
  file(report: NewBugReport): Promise<FiledBugReport>;
};

export type GitHubIssueTrackerOptions = {
  /** `owner/repo` — the repository the issues land in. */
  repository: string;
  token: string;
  /** Labels every filed report carries, so player reports are one query away. */
  labels?: readonly string[];
  /** Stamped on every issue: which build served the reporter. */
  serverRevision?: string;
  fetch?: typeof globalThis.fetch;
};

/**
 * Files player bug reports as issues on the project's GitHub repository.
 *
 * The repository is public, so the issue body carries the reporter's display name and nothing else
 * about their account: no email, no id, and no address for the anonymous ones. Every field the
 * reporter typed is neutralized before it goes in (see `neutralizeMarkdownRefs`) — otherwise a
 * report could mass-ping maintainers or cross-link unrelated issues just by containing an `@` or
 * a `#`.
 */
export class GitHubIssueTracker implements IssueTracker {
  private readonly fetch: typeof globalThis.fetch;

  constructor(private readonly options: GitHubIssueTrackerOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * Reads the tracker the environment configures, or undefined when this deployment has none — a
   * local run without a token still boots, and the route answers that reports are unavailable.
   */
  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): GitHubIssueTracker | undefined {
    const token = env.GITHUB_TOKEN;
    const repository = env.GITHUB_BUG_REPOSITORY;
    if (!token || !repository) return undefined;
    const labels = env.GITHUB_BUG_LABELS?.split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    return new GitHubIssueTracker({
      repository,
      token,
      labels: labels?.length ? labels : ["player-report"],
      serverRevision: env.AEGIS_REVISION,
    });
  }

  async file(report: NewBugReport): Promise<FiledBugReport> {
    const response = await this.fetch(`${GITHUB_API}/repos/${this.options.repository}/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: issueTitle(report),
        body: issueBody(report, this.options.serverRevision),
        labels: this.options.labels,
      }),
    });
    if (!response.ok) {
      throw new Error(`GitHub refused the issue: ${response.status} ${await response.text().catch(() => "")}`.trim());
    }
    const issue = (await response.json()) as { number: number; html_url: string };
    return { number: issue.number, url: issue.html_url };
  }
}

/** `BT1-010 +2 — the summary`, so a card bug is recognizable straight from the issue list. */
export function issueTitle({ summary, cardIds }: NewBugReport): string {
  const [first, ...rest] = cardIds;
  const prefix = first ? `${first}${rest.length ? ` +${rest.length}` : ""} — ` : "";
  return truncate(`${prefix}${summary}`, ISSUE_TITLE_LIMIT);
}

export function issueBody(report: NewBugReport, serverRevision?: string): string {
  const { reporterName, cardIds, description, opponentDeck, attachmentUrl } = report;
  const sections = [
    "### Cards",
    cardIds.length
      ? cardIds.map((cardId) => `- \`${cardId}\` — ${getCardDefinition(cardId)?.nameEn ?? "unknown"}`).join("\n")
      : "_None named._",
    "",
    "### Steps to reproduce",
    neutralizeMarkdownRefs(description),
  ];
  if (opponentDeck) sections.push("", "### Opponent's deck", neutralizeMarkdownRefs(opponentDeck));
  // A bare URL, never a markdown link: the reporter must not get to choose the text it hides behind.
  if (attachmentUrl) sections.push("", "### Attachment", attachmentUrl);
  const credit = reporterName ? `**${neutralizeMarkdownRefs(reporterName)}**` : "an anonymous player";
  sections.push("", "---", `Reported in-game by ${credit}.`, reportContext(report, serverRevision));
  return sections.join("\n");
}

/** The build and browser the reporter was on, which they should never have to type. */
function reportContext({ clientRevision, userAgent }: NewBugReport, serverRevision?: string): string {
  const parts = [
    `client \`${code(clientRevision ?? "unknown")}\``,
    `server \`${code(serverRevision ?? "unknown")}\``,
    ...(userAgent ? [`\`${code(truncate(userAgent, USER_AGENT_LIMIT))}\``] : []),
  ];
  return parts.join(" · ");
}

// GitHub turns `@handle` into a notification and `#123` into a cross-link, so text a stranger typed
// is a way to ping maintainers and litter unrelated issues. Backticks make both inert while leaving
// the text readable.
export function neutralizeMarkdownRefs(text: string): string {
  return text.replace(/[@#][\w-]+/g, (reference) => `\`${reference}\``);
}

/** Strips the one character that could break out of the code span this value is rendered inside. */
function code(value: string): string {
  return value.replace(/`/g, "");
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}
