import React, { useState } from "react";
import { Users, Trophy, SlidersHorizontal } from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { MemberSkeleton } from "../../skeletons";
import AppModal from "../../../../../shared/components/AppModal";
import styles from "./ClubMembers.module.css";
import {
  isMembersSortMode,
  type MembersFilterState,
  type MembersSortMode,
  type DatePreset,
  type ClubPeriodSummaryCategory,
} from "../../types";
