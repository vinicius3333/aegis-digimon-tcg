/* The community-deck wire contract. A public deck is a frozen copy of a saved deck: editing the
   saved deck changes nothing here until its owner publishes again. Public decks carry only the
   deck name as free text, and the api screens that name before it is stored. */

export const COMMUNITY_DECK_NAME_MAX = 40;
export const COMMUNITY_PAGE_SIZE = 24;

export const COMMUNITY_SORTS = ["top", "new"] as const;
export type CommunitySort = (typeof COMMUNITY_SORTS)[number];

export const COMMUNITY_PERIODS = ["week", "month", "all"] as const;
export type CommunityPeriod = (typeof COMMUNITY_PERIODS)[number];

/** `hidden` is set by moderation, never by the owner, and only a moderator lifts it. */
export type CommunityPublicationStatus = "public" | "hidden";

export interface CommunityDeckAuthor {
  id: string;
  displayName: string;
}

export interface CommunityDeckSummary {
  id: string;
  name: string;
  author: CommunityDeckAuthor;
  colors: string[];
  coverCardId: string | null;
  likeCount: number;
  copyCount: number;
  likedByMe: boolean;
  legal: boolean;
  publishedAt: number;
  updatedAt: number;
}

export interface CommunityDeck extends CommunityDeckSummary {
  /** Always `public` for players; only moderators can open a hidden deck. */
  status: CommunityPublicationStatus;
  mainDeck: string[];
  eggDeck: string[];
  mainDeckArts: string[];
  eggDeckArts: string[];
}

export interface CommunityDeckPage {
  decks: CommunityDeckSummary[];
  hasMore: boolean;
}

/** One of the viewer's own saved decks that is public or hidden, keyed back to the saved deck. */
export interface CommunityPublication {
  id: string;
  sourceDeckId: string;
  name: string;
  likeCount: number;
  /** The saved deck changed after it was published, so the public copy is behind. */
  outdated: boolean;
  status: CommunityPublicationStatus;
}

export interface CommunityLikeResult {
  liked: boolean;
  likeCount: number;
}

export type CommunityPublishError = "deck_not_found" | "deck_not_legal" | "name_not_allowed" | "deck_hidden";

export const COMMUNITY_REPORT_REASONS = ["offensive_name", "inappropriate_content", "spam", "other"] as const;
export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number];
export const COMMUNITY_REPORT_DETAILS_MAX = 500;

export interface CommunityReportInput {
  reason: CommunityReportReason;
  details?: string;
}

export const COMMUNITY_MODERATION_ACTIONS = ["hide", "restore"] as const;
export type CommunityModerationAction = (typeof COMMUNITY_MODERATION_ACTIONS)[number];
