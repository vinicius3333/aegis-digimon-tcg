import { useCallback, useContext, useEffect, useState } from "react";
import type { Friend } from "@aegis/shared/friends/Friend";
import type { FriendRequest } from "@aegis/shared/friends/FriendRequest";
import { FriendRequestDirection } from "@aegis/shared/friends/FriendRequestDirection";
import type { SocialPresence } from "@aegis/shared/social/SocialPresence";
import { SocialStatus } from "@aegis/shared/social/SocialStatus";
import { Avatar, Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { friendsApi } from "@/friends/friendsApi";
import { HomeCard } from "@/home/HomeCard";
import { useTranslation } from "@/i18n/useTranslation";
import { SocialContext } from "@/social/SocialContext";

const HOME_FRIEND_COUNT = 6;

type PresentFriend = Friend & SocialPresence;

type HomeFriendsCardParams = {
  onOpenFriends: () => void;
};

export function HomeFriendsCard({ onOpenFriends }: HomeFriendsCardParams) {
  const { t } = useTranslation();
  const social = useContext(SocialContext);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const loadRequests = useCallback(() => {
    void friendsApi
      .requests()
      .then((result) =>
        setRequests(result.requests.filter((entry) => entry.direction === FriendRequestDirection.INCOMING.value)),
      )
      .catch(() => undefined);
  }, []);
  useEffect(loadRequests, [loadRequests, social.revision]);
  const friends = [...social.friends].sort(compareFriends);
  const online = friends.filter((friend) => friend.status !== null);
  const offline = friends.filter((friend) => friend.status === null);
  const shown = [...online, ...offline].slice(0, HOME_FRIEND_COUNT);
  const shownOnline = shown.filter((friend) => friend.status !== null);
  const shownOffline = shown.filter((friend) => friend.status === null);
  const request = requests[0];

  async function answer(accept: boolean) {
    if (!request) {
      return;
    }
    setBusy(true);
    try {
      await (accept ? friendsApi.accept(request.accountId) : friendsApi.decline(request.accountId));
      social.refresh();
      loadRequests();
    } catch {
      loadRequests();
    } finally {
      setBusy(false);
    }
  }

  return (
    <HomeCard
      className="home-friends"
      title={
        <>
          {t("friends.title")}
          <span className="home-card__count">{t("home.friends.online", { count: online.length })}</span>
        </>
      }
      tools={
        <button type="button" className="home-icon-link" aria-label={t("friends.add")} onClick={onOpenFriends}>
          <Icons.UserPlus size={16} />
        </button>
      }
    >
      {request ? (
        <div className="home-friend-request">
          <Avatar name={request.displayName} avatarId={request.avatarId} avatarUrl={request.avatarUrl} size={28} />
          <p>{t("home.friends.request", { name: request.displayName })}</p>
          <div className="home-friend-request__actions">
            <Button size="sm" icon={Icons.Check} disabled={busy} onClick={() => void answer(true)}>
              <span className="aegis-sr-only">{t("friends.accept")}</span>
            </Button>
            <Button size="sm" variant="secondary" icon={Icons.X} disabled={busy} onClick={() => void answer(false)}>
              <span className="aegis-sr-only">{t("friends.decline")}</span>
            </Button>
          </div>
        </div>
      ) : null}
      {friends.length === 0 ? (
        <div className="home-empty">
          <Icons.Users size={22} aria-hidden="true" />
          <p>
            <span>{t("home.friends.empty")}</span>
          </p>
          <Button size="sm" variant="secondary" icon={Icons.UserPlus} onClick={onOpenFriends}>
            {t("friends.add")}
          </Button>
        </div>
      ) : (
        <ul className="home-rail home-friends__list">
          <li className="home-friend-add">
            <button type="button" onClick={onOpenFriends}>
              <span aria-hidden="true">
                <Icons.Plus size={18} />
              </span>
              {t("common.add")}
            </button>
          </li>
          {shownOnline.map((friend) => (
            <HomeFriend key={friend.accountId} friend={friend} />
          ))}
          {shownOffline.length > 0 ? <li className="home-friend-group">{t("friends.status.offline")}</li> : null}
          {shownOffline.map((friend) => (
            <HomeFriend key={friend.accountId} friend={friend} />
          ))}
        </ul>
      )}
      {friends.length > HOME_FRIEND_COUNT ? (
        <button type="button" className="home-link home-friends__more" onClick={onOpenFriends}>
          {t("home.viewAll")}
          <Icons.ChevronRight size={14} aria-hidden="true" />
        </button>
      ) : null}
    </HomeCard>
  );
}

function HomeFriend({ friend }: { friend: PresentFriend }) {
  const { t } = useTranslation();
  const social = useContext(SocialContext);
  const watching = friend.status === SocialStatus.IN_MATCH.value && friend.roomCode && social.watch;
  return (
    <li className="home-friend" data-status={friend.status ?? "offline"}>
      <span className="home-friend__avatar">
        <Avatar name={friend.displayName} avatarId={friend.avatarId} avatarUrl={friend.avatarUrl} size={34} />
      </span>
      <div className="home-friend__info">
        <b>{friend.displayName}</b>
        <small>{t(`friends.status.${friend.status ?? "offline"}`)}</small>
      </div>
      {watching ? (
        <Button
          size="sm"
          variant="ghost"
          icon={Icons.Eye}
          disabled={!social.connected}
          onClick={() => social.watch?.(friend)}
        >
          {t("friends.watch")}
        </Button>
      ) : null}
      {!watching && friend.status !== null && social.challenge ? (
        <Button
          size="sm"
          variant="secondary"
          icon={Icons.Send}
          disabled={!social.connected}
          onClick={() => social.challenge?.(friend)}
        >
          {t("friends.challenge")}
        </Button>
      ) : null}
    </li>
  );
}

function compareFriends(first: PresentFriend, second: PresentFriend): number {
  return getStatusPriority(second) - getStatusPriority(first) || first.displayName.localeCompare(second.displayName);
}

function getStatusPriority(friend: PresentFriend): number {
  const entry = Object.values(SocialStatus).find((status) => status.value === friend.status);
  return entry?.priority ?? 0;
}
