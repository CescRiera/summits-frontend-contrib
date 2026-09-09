import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { StatsGraphResponse } from "../../../../shared/api/types";
import { useI18n } from "../../../../shared/context/I18nContext";
import { timeStringToSeconds } from "../../../desktop-utils/desktop-timeFormatting.ts";
import {
  formatStatDuration,
  formatStatInteger,
} from "../../../../mobile/utils/numberFormatting.ts";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { getIntlLocale } from "../../../../shared/i18n/languages";

export type TimeAggregation =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

interface StatsChartProps {
  data: StatsGraphResponse;
  metric:
    | "distance"
    | "elevation_gain"
    | "time"
    | "moving_time"
    | "peaks"
    | "routes";
  activityFilter: string;
  timeAggregation: TimeAggregation;
  customStartDate: string | null;
  customEndDate: string | null;
}

const getWeekKey = (date: Date): string => {
  // Get Monday of the week (start of week)
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);

  return monday.toISOString().split("T")[0] || ""; // Return Monday's date as key
};

const getWeekDateRange = (weekStartDate: Date, locale: string): string => {
  const monday = new Date(weekStartDate);
  const sunday = new Date(weekStartDate);
  sunday.setDate(monday.getDate() + 6);

  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = monday.toLocaleString(locale, { month: "short" });
  const year = monday.getFullYear();

  // Show date range with the starting month and year
  return `${startDay} - ${endDay} ${startMonth} ${year}`;
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

const getYearKey = (date: Date): string => {
  return `${date.getFullYear()}`;
};

const StatsChart: React.FC<StatsChartProps> = ({
  data,
  metric,
  activityFilter,
  timeAggregation,
  customStartDate,
  customEndDate,
}) => {
  const { t, language } = useI18n();
  const locale = getIntlLocale(language);
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();

  // Translation function for metric config
  const getMetricConfig = (metricKey: string) => {
    const configs: Record<string, any> = {
      distance: {
        label: `${t("userStats.metrics.distance")} (km)`,
        color: "#3b82f6",
        formatter: (value: number) => formatStatDistance(value),
      },
      elevation_gain: {
        label: `${t("userStats.metrics.elevationGain")} (m)`,
        color: "#10b981",
        formatter: (value: number) => formatStatElevationGain(value),
      },
      time: {
        label: t("userStats.metrics.totalTime"),
        color: "#f59e0b",
        formatter: (value: number) => formatStatDuration(value),
      },
      moving_time: {
        label: t("userStats.metrics.movingTime"),
        color: "#8b5cf6",
        formatter: (value: number) => formatStatDuration(value),
      },
      peaks: {
        label: t("userStats.metrics.peaks"),
        color: "#ef4444",
        formatter: (value: number) => formatStatInteger(value),
      },
      routes: {
        label: t("userStats.metrics.routes"),
        color: "#06b6d4",
        formatter: (value: number) => formatStatInteger(value),
      },
    };
    return configs[metricKey];
  };
  const chartData = useMemo(() => {
    let filtered =
      activityFilter === "all"
        ? data.routes
        : data.routes.filter((r) => r.activity_type === activityFilter);

    // Apply custom date range filter if selected
    if (timeAggregation === "custom") {
      if (customStartDate) {
        filtered = filtered.filter((r) => r.date >= customStartDate);
      }
      if (customEndDate) {
        filtered = filtered.filter((r) => r.date <= customEndDate);
      }
    }

    // Sort by date
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by the selected time aggregation
    const aggregatedData = new Map<
      string,
      {
        distance: number;
        elevation_gain: number;
        time: number;
        moving_time: number;
        peaks: number;
        routes: number;
        date: string;
        formattedDate: string;
      }
    >();

    sorted.forEach((route) => {
      const routeDate = new Date(route.date);
      let dateKey: string;
      let formattedDate: string;

      switch (timeAggregation) {
        case "daily":
        case "custom":
          dateKey = route.date; // YYYY-MM-DD
          formattedDate = routeDate.toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          break;
        case "weekly":
          dateKey = getWeekKey(routeDate);
          formattedDate = getWeekDateRange(new Date(dateKey), locale);
          break;
        case "monthly":
          dateKey = getMonthKey(routeDate);
          formattedDate = routeDate.toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
          });
          break;
        case "yearly":
          dateKey = getYearKey(routeDate);
          formattedDate = dateKey;
          break;
        default:
          dateKey = route.date;
          formattedDate = route.date;
      }

      if (!aggregatedData.has(dateKey)) {
        aggregatedData.set(dateKey, {
          distance: 0,
          elevation_gain: 0,
          time: 0,
          moving_time: 0,
          peaks: 0,
          routes: 0,
          date: dateKey,
          formattedDate,
        });
      }

      const entry = aggregatedData.get(dateKey)!;
      entry.distance += route.distance ?? 0;
      entry.elevation_gain += route.elevation_gain ?? 0;
      entry.time += timeStringToSeconds(route.time ?? "");
      entry.moving_time += timeStringToSeconds(route.moving_time ?? "");
      entry.peaks += route.peaks ?? 0;
      entry.routes += 1;
    });

    return Array.from(aggregatedData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [data, activityFilter, timeAggregation, customStartDate, customEndDate, locale]);

  const config = getMetricConfig(metric);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(15, 23, 42, 0.5)",
        }}
        className="typography-desktop-body-small"
      >
        {t("userStats.chart.noDataAvailable")}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: -5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.1)" />
        <XAxis dataKey="date" hide={true} stroke="rgba(15, 23, 42, 0.6)" />
        <YAxis
          stroke="rgba(15, 23, 42, 0.6)"
          tick={{ fill: "rgba(15, 23, 42, 0.6)", fontSize: 12 }}
          tickFormatter={(value) => {
            if (metric === "time" || metric === "moving_time") {
              return formatStatDuration(value, 1);
            }
            return formatStatInteger(value);
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: "1px solid rgba(15, 23, 42, 0.2)",
            borderRadius: 8,
            color: "#0f172a",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
          }}
          formatter={(value: number) => [config.formatter(value), config.label]}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0) {
              return payload[0]?.payload?.formattedDate || label;
            }
            return label;
          }}
        />
        <Legend
          wrapperStyle={{ color: "rgba(15, 23, 42, 0.8)", bottom: "-5px" }}
          formatter={() => config.label}
        />
        <Line
          type="monotone"
          dataKey={metric}
          stroke={config.color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: config.color,
            strokeWidth: 2,
            stroke: "rgb(255, 255, 255)",
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default StatsChart;
