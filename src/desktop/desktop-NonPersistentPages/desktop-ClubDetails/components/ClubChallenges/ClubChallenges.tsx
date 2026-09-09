import React from "react";
import { ChevronLeft, ChevronRight, Plus, Trophy, X, Map as MapIcon } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { useI18n } from "../../../../../shared/context/I18nContext";
import CreatorBadge from "../../../../../shared/components/CreatorBadge/CreatorBadge";
import ChallengeLeaderboard from "../ChallengeLeaderboard/ChallengeLeaderboard";
import styles from "./ClubChallenges.module.css";
import type { ClubChallengeItem } from "../../../../../shared/api/types/clubs";
import type { PeakListUser } from "../../../../../shared/api/types";

interface ClubChallengesProps {
  challenges: ClubChallengeItem[];
  canCreate: boolean;
  onCreate: () => void;
  selectedChallengeId: number | null;
  onSelectedChallengeChange: (id: number | null) => void;
  leaderboardUsers: PeakListUser[];
  leaderboardAuthUserRank: any | null;
  leaderboardLoading: boolean;
  leaderboardObserverRef: React.RefObject<HTMLDivElement | null>;
  onUserClick: (userId: number) => void;
  onToggleFollow: (id: number, following: boolean) => void;
  isJoining: number | null;
  buildConstraintMeta: (challenge: ClubChallengeItem) => string[];
  navigate: (path: string) => void;
  setSwiperInstance: (instance: any) => void;
  prevButtonRef: React.RefObject<HTMLButtonElement | null>;
  nextButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const ClubChallenges: React.FC<ClubChallengesProps> = ({
  challenges,
  canCreate,
  onCreate,
  selectedChallengeId,
  onSelectedChallengeChange,
  leaderboardUsers,
  leaderboardAuthUserRank,
  leaderboardLoading,
  leaderboardObserverRef,
  onUserClick,
  onToggleFollow,
  isJoining,
  buildConstraintMeta,
  navigate,
  setSwiperInstance,
  prevButtonRef,
  nextButtonRef,
}) => {
  const { t } = useI18n();

  const renderChallengeHero = (challenge: ClubChallengeItem) => {
    const meta = buildConstraintMeta(challenge);
    return (
      <div
        className={styles["club-challenges__hero"]}
        style={{ backgroundImage: challenge.primary_image ? `url(${challenge.primary_image})` : undefined }}
      >
        <div className={styles["club-challenges__hero-overlay"]} />
        <div className={styles["club-challenges__hero-content"]}>
          <button
            className={`${styles["club-challenges__follow-btn"]} ${challenge.is_following ? styles["club-challenges__follow-btn--following"] : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow(challenge.list_id, !!challenge.is_following);
            }}
          >
            {isJoining === challenge.list_id ? (
              <div className={styles["club-challenges__spinner"]} />
            ) : challenge.is_following ? (
              <X size={14} />
            ) : (
              <Plus size={14} />
            )}
            <span className="typography-desktop-label-small">
              {challenge.is_following ? t("common.leave") || "Leave" : t("common.join") || "Join"}
            </span>
          </button>

          <span className={`${styles["club-challenges__hero-name"]} typography-desktop-headline-medium`}>
            {challenge.name || challenge.list_name}
          </span>

          {(challenge.creator_name || challenge.creator_image) && (
            <CreatorBadge
              name={challenge.creator_name ?? null}
              imageUrl={challenge.creator_image ?? null}
              className={styles["club-challenges__creator-badge"]}
              size="lg"
              variant="dark"
            />
          )}

          <div className={styles["club-challenges__total-peaks"]}>
            <span className={`${styles["club-challenges__total-peaks-number"]} typography-desktop-display-xxl`}>
              {challenge.total_peaks || 0}
            </span>
            <span className={`${styles["club-challenges__total-peaks-label"]} typography-desktop-label-large`}>
              {t("leaderboard.peaks") || "peaks"}
            </span>
          </div>

          <div className={styles["club-challenges__meta"]}>
            {meta.map((item) => (
              <span key={item} className={`${styles["club-challenges__meta-pill"]} typography-desktop-label-small`}>
                {item}
              </span>
            ))}
          </div>

          <div className={styles["club-challenges__actions"]}>
            <button
              className={`${styles["club-challenges__action-btn"]} ${styles["club-challenges__action-btn--secondary"]} typography-desktop-button-medium`}
              onClick={() => navigate(`/list-details/${challenge.list_id}`)}
            >
              {t("common.seeMore") || "See more"}
            </button>
            <button
              className={`${styles["club-challenges__action-btn"]} ${styles["club-challenges__action-btn--primary"]} typography-desktop-button-medium`}
              onClick={() => navigate(`/map?listId=${challenge.list_id}`)}
            >
              <MapIcon size={18} style={{ marginRight: '8px' }} /> {t("common.seeOnMap") || "See on map"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles["club-challenges"]}>
      <div className={styles["club-challenges__top"]}>
        <h3 className={`${styles["club-challenges__top-title"]} typography-desktop-title-medium`}>
          {t("clubs.challenges.viewProgress") || "View the progress of the club challenges"}
        </h3>

        <button
          type="button"
          className={`${styles["club-challenges__create-btn"]} typography-desktop-button-small`}
          onClick={onCreate}
          disabled={!canCreate}
        >
          {t("clubs.challenges.create") || "Create challenge"}
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className={styles["club-challenges__empty"]}>
          <Trophy size={26} />
          <p className="typography-desktop-body-small">
            {t("clubs.challenges.empty") || "No challenges yet."}
          </p>
        </div>
      ) : (
        <>
          <div className={styles["club-challenges__hero-wrapper"]}>
            {challenges.length === 1 ? (
              challenges[0] ? renderChallengeHero(challenges[0]) : null
            ) : (
              <>
                <Swiper
                  spaceBetween={0}
                  slidesPerView={1}
                  loop={challenges.length > 3}
                  centeredSlides
                  allowTouchMove={false}
                  observer={true}
                  observeParents={true}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  modules={[Pagination, Navigation]}
                  className={styles["club-challenges__swiper"]}
                  onSwiper={setSwiperInstance}
                  navigation={{
                    enabled: true,
                    prevEl: prevButtonRef.current ?? null,
                    nextEl: nextButtonRef.current ?? null,
                  }}
                  onSlideChange={(swiper) => {
                    const challenge = challenges[swiper.realIndex];
                    if (challenge) onSelectedChallengeChange(challenge.list_id);
                  }}
                  initialSlide={Math.max(
                    0,
                    challenges.findIndex((c) => c.list_id === selectedChallengeId)
                  )}
                >
                  {challenges.map((challenge) => (
                    <SwiperSlide key={challenge.list_id}>
                      {renderChallengeHero(challenge)}
                    </SwiperSlide>
                  ))}
                </Swiper>
                <button
                  ref={prevButtonRef}
                  className={`${styles["club-challenges__nav-btn"]} ${styles["club-challenges__nav-btn--prev"]}`}
                >
                  <ChevronLeft />
                </button>
                <button
                  ref={nextButtonRef}
                  className={`${styles["club-challenges__nav-btn"]} ${styles["club-challenges__nav-btn--next"]}`}
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>

          <ChallengeLeaderboard
            users={leaderboardUsers}
            authUserRank={leaderboardAuthUserRank}
            loading={leaderboardLoading}
            onUserClick={onUserClick}
            observerRef={leaderboardObserverRef}
            selectedChallengeId={selectedChallengeId}
          />
        </>
      )}
    </div>
  );
};

export default ClubChallenges;
