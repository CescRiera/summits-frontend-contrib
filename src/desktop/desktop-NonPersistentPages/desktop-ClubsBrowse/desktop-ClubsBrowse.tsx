import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Plus, Shield, Users } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import OverlayHeader from "../../desktop-components/desktop-Overlay/desktop-OverlayHeader/desktop-OverlayHeader.tsx";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import ClubActionButtons from "../../../shared/components/clubs/ClubActionButtons";
import {
  useClubsBrowse,
  useClubMutations,
} from "../../../shared/hooks/clubs/useClubs";
import { flattenClubPages } from "../../../shared/utils/clubResponse";
import { getClubApiErrorMessage } from "../../../shared/utils/clubForm";
import { getClubMembershipBadgeKey } from "../../../shared/utils/clubState";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import rawStyles from "./desktop-ClubPages.module.css";

const styles = rawStyles as any;

const DesktopClubsBrowse: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "">("");
  const [sortBy, setSortBy] = useState<
    "most_users" | "most_peaks" | "newest" | "oldest"
  >("most_users");
  const [actionError, setActionError] = useState<string | null>(null);

  const clubsQuery = useClubsBrowse({
    search,
    ...(visibility ? { visibility } : {}),
    sort_by: sortBy,
  });
  const mutations = useClubMutations();

  const clubs = useMemo(
    () => flattenClubPages(clubsQuery.data?.pages),
    [clubsQuery.data?.pages]
  );
  const summaryStats = useMemo(() => {
    const clubsCount = clubs.length;
    const publicClubs = clubs.filter((club) => club.visibility === "public").length;
    const privateClubs = clubsCount - publicClubs;
    const members = clubs.reduce((acc, club) => acc + (club.member_count ?? 0), 0);
    const peaks = clubs.reduce(
      (acc, club) => acc + (club.distinct_peak_count ?? 0),
      0
    );

    return { clubsCount, publicClubs, privateClubs, members, peaks };
  }, [clubs]);

  const handleActionError = (error: unknown) => {
    setActionError(
      getClubApiErrorMessage(
        error,
        t("clubs.messages.actionFailed") || "Could not update club membership."
      )
    );
  };

  const handleJoin = async (clubId: number) => {
    try {
      setActionError(null);
      await mutations.joinClub.mutateAsync(clubId);
    } catch (error) {
      handleActionError(error);
    }
  };

  const handleCancel = async (clubId: number) => {
    try {
      setActionError(null);
      await mutations.cancelJoinRequest.mutateAsync(clubId);
    } catch (error) {
      handleActionError(error);
    }
  };

  const handleLeave = async (clubId: number) => {
    const confirmed = window.confirm(
      t("clubs.actions.leaveConfirm") ||
        "Leave this club? You can always join again later."
    );
    if (!confirmed) return;

    try {
      setActionError(null);
      await mutations.leaveClub.mutateAsync(clubId);
    } catch (error) {
      handleActionError(error);
    }
  };

  if (clubsQuery.isLoading) {
    return (
      <div className={styles.page}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <section className={`${styles.section} ${styles.topPanel}`}>
          <OverlayHeader
            title={t("clubs.browse.title") || "Browse clubs"}
            rightContent={
              <div className={styles.actionRow}>
                {user ? (
                  <button
                    type="button"
                    className={`${styles.button} typography-desktop-button-small`}
                    onClick={() => navigate("/clubs/create")}
                  >
                    <Plus size={16} />
                    {t("clubs.create.title") || "Create club"}
                  </button>
                ) : null}
              </div>
            }
          />

          <p className={`${styles.sectionSubtitle} typography-desktop-body-small`}>
            {t("clubs.browse.subtitle") ||
              "Explore public and private communities built around shared peak progress."}
          </p>

          <div className={styles.dashboardStatsGrid}>
            <article className={styles.dashboardStatCard}>
              <span className={`${styles.muted} typography-desktop-label-small`}>
                {t("clubs.browse.title") || "Clubs"}
              </span>
              <strong className="typography-desktop-title-medium">
                {summaryStats.clubsCount.toLocaleString()}
              </strong>
            </article>
            <article className={styles.dashboardStatCard}>
              <span className={`${styles.muted} typography-desktop-label-small`}>
                {t("clubs.visibility.public") || "Public"}
              </span>
              <strong className="typography-desktop-title-medium">
                {summaryStats.publicClubs.toLocaleString()}
              </strong>
            </article>
            <article className={styles.dashboardStatCard}>
              <span className={`${styles.muted} typography-desktop-label-small`}>
                {t("clubs.visibility.private") || "Private"}
              </span>
              <strong className="typography-desktop-title-medium">
                {summaryStats.privateClubs.toLocaleString()}
              </strong>
            </article>
            <article className={styles.dashboardStatCard}>
              <span className={`${styles.muted} typography-desktop-label-small`}>
                {t("clubs.metrics.members") || "Members"}
              </span>
              <strong className="typography-desktop-title-medium">
                {summaryStats.members.toLocaleString()}
              </strong>
            </article>
            <article className={styles.dashboardStatCard}>
              <span className={`${styles.muted} typography-desktop-label-small`}>
                {t("clubs.metrics.distinctPeaks") || "Distinct peaks"}
              </span>
              <strong className="typography-desktop-title-medium">
                {summaryStats.peaks.toLocaleString()}
              </strong>
            </article>
          </div>

          <div className={styles.browseToolbar}>
            <div className={styles.controls}>
              <input
                type="search"
                className={`${styles.input} typography-desktop-body-small`}
                placeholder={t("clubs.browse.searchPlaceholder") || "Search clubs"}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className={`${styles.select} typography-desktop-body-small`}
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as "public" | "private" | "")
                }
              >
                <option value="">{t("clubs.filters.allVisibility") || "All visibility"}</option>
                <option value="public">{t("clubs.visibility.public") || "Public"}</option>
                <option value="private">{t("clubs.visibility.private") || "Private"}</option>
              </select>
              <select
                className={`${styles.select} typography-desktop-body-small`}
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as
                      | "most_users"
                      | "most_peaks"
                      | "newest"
                      | "oldest"
                  )
                }
              >
                <option value="most_users">{t("clubs.sort.mostUsers") || "Most members"}</option>
                <option value="most_peaks">{t("clubs.sort.mostPeaks") || "Most peaks"}</option>
                <option value="newest">{t("clubs.sort.newest") || "Newest"}</option>
                <option value="oldest">{t("clubs.sort.oldest") || "Oldest"}</option>
              </select>
            </div>
          </div>

          {actionError ? (
            <div className={`${styles.errorBox} typography-desktop-body-small`}>
              {actionError}
            </div>
          ) : null}
        </section>

        {clubsQuery.isError ? (
          <section className={styles.section}>
            <div className={`${styles.errorBox} typography-desktop-body-small`}>
              {t("clubs.messages.loadFailed") || "Could not load clubs right now."}
            </div>
          </section>
        ) : null}

        {clubs.length === 0 && !clubsQuery.isFetching ? (
          <section className={styles.section}>
            <div className={`${styles.emptyState} typography-desktop-body-small`}>
              <Users size={22} />
              <strong>{t("clubs.browse.emptyTitle") || "No clubs yet"}</strong>
              <span>
                {t("clubs.browse.emptyMessage") ||
                  "Try a broader search or create a new club for your mountain group."}
              </span>
            </div>
          </section>
        ) : null}

        <section className={styles.cardList}>
          {clubs.map((club) => {
            const membershipBadgeKey = getClubMembershipBadgeKey(club);

            return (
              <article key={club.id} className={styles.card}>
                <div className={styles.cardTop}>
                  {club.image ? (
                    <img
                      src={club.image}
                      alt={club.name}
                      className={styles.cardImage}
                    />
                  ) : (
                    <div className={`${styles.cardImage} ${styles.heroPlaceholder}`}>
                      <Users size={36} />
                    </div>
                  )}

                  <div className={styles.cardBody}>
                    <div className={styles.badgeRow}>
                      <span
                        className={`${styles.badge} ${
                          club.visibility === "private"
                            ? styles.badgePrivate
                            : ""
                        } typography-desktop-label-small`}
                      >
                        {club.visibility === "private" ? (
                          <Lock size={12} />
                        ) : (
                          <Shield size={12} />
                        )}
                        {club.visibility === "private"
                          ? t("clubs.visibility.private") || "Private"
                          : t("clubs.visibility.public") || "Public"}
                      </span>
                      {membershipBadgeKey ? (
                        <span
                          className={`${styles.badge} ${
                            club.membership?.status === "pending"
                              ? styles.badgePending
                              : ""
                          } typography-desktop-label-small`}
                        >
                          {t(membershipBadgeKey)}
                        </span>
                      ) : null}
                    </div>

                    <h3 className={`${styles.cardTitle} typography-desktop-title-medium`}>
                      {club.name}
                    </h3>
                    <p className={`${styles.cardText} typography-desktop-body-small`}>
                      {club.description}
                    </p>
                    <div className={styles.metaGrid}>
                      <div className={`${styles.metaPill} typography-desktop-body-small`}>
                        <strong>{club.member_count.toLocaleString()}</strong>{" "}
                        {t("clubs.metrics.members") || "members"}
                      </div>
                      {club.admin_hierarchy && (
                        <div className={`${styles.metaPill} typography-desktop-body-small`}>
                          <span>{getLocationFromHierarchy(club.admin_hierarchy)}</span>
                        </div>
                      )}
                      {!club.restricted ? (
                        <div className={`${styles.metaPill} typography-desktop-body-small`}>
                          <strong>
                            {(club.distinct_peak_count ?? 0).toLocaleString()}
                          </strong>{" "}
                          {t("clubs.metrics.distinctPeaks") || "distinct peaks"}
                        </div>
                      ) : null}
                      <div className={`${styles.metaPill} typography-desktop-body-small`}>
                        <strong>{club.creator.name || t("clubs.common.creator") || "Creator"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={`${styles.buttonGhost} typography-desktop-button-small`}
                    onClick={() => navigate(`/clubs/${club.id}`)}
                  >
                    {t("clubs.actions.viewClub") || "View club"}
                  </button>
                  <ClubActionButtons
                    club={club}
                    isAuthenticated={Boolean(user)}
                    t={t}
                    onSignIn={() => navigate("/profile")}
                    onJoin={() => handleJoin(club.id)}
                    onCancelRequest={() => handleCancel(club.id)}
                    onLeave={() => handleLeave(club.id)}
                    onEdit={() => navigate(`/clubs/${club.id}/edit`)}
                    disabled={
                      mutations.joinClub.isPending ||
                      mutations.cancelJoinRequest.isPending ||
                      mutations.leaveClub.isPending
                    }
                    className={styles.cardActionButtons}
                    primaryClassName={`${styles.button} typography-desktop-button-small`}
                    secondaryClassName={`${styles.buttonSecondary} typography-desktop-button-small`}
                  />
                </div>
              </article>
            );
          })}
        </section>

        {clubsQuery.hasNextPage ? (
          <div className={styles.loadMoreWrap}>
            <button
              type="button"
              className={`${styles.buttonSecondary} typography-desktop-button-small`}
              onClick={() => void clubsQuery.fetchNextPage()}
              disabled={clubsQuery.isFetchingNextPage}
            >
              {clubsQuery.isFetchingNextPage
                ? t("common.loading")
                : t("clubs.actions.loadMore") || "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DesktopClubsBrowse;
