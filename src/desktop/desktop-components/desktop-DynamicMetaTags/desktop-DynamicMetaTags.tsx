import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { getOpenGraphLocale } from "../../../shared/i18n/languages";

const DynamicMetaTags: React.FC = () => {
  const { t, language } = useI18n();
  const location = useLocation();

  useEffect(() => {
    const updateMetaTag = (property: string, content: string) => {
      // Update or create meta tag
      let meta = document.querySelector(
        `meta[property="${property}"]`
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const updateNameMetaTag = (name: string, content: string) => {
      // Update or create meta tag with name attribute
      let meta = document.querySelector(
        `meta[name="${name}"]`
      ) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(
        `link[rel="${rel}"]`
      ) as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };

    const updateTitle = (title: string) => {
      document.title = title;
    };

    const baseUrl = "https://summitstracker.com";
    const currentUrl = `${baseUrl}${location.pathname}`;
    const ogImage = `${baseUrl}/icon-512.webp`;
    const siteName = "SummitsTracker";

    // Route-specific SEO metadata
    const routeMetadata: Record<
      string,
      { title: string; description: string; keywords: string }
    > = {
      "/": {
        title:
          "SummitsTracker - Track Your Mountain Peaks | Summitstracker.com",
        description:
          "SummitsTracker - Track your summit achievements, share peaks with the community, and discover climbs from other mountaineers around the world. The ultimate mountain peak tracking platform.",
        keywords:
          "summitstracker, summits tracker, mountain peaks, climbing tracker, mountaineering, peak tracking, mountain climbing, summit achievements, hiking tracker",
      },
      "/explore": {
        title: "Explore Mountain Peaks - SummitsTracker",
        description:
          "Explore and discover amazing mountain peaks from around the world. Browse peak lists, view community achievements, and find your next climbing adventure on SummitsTracker.",
        keywords:
          "explore peaks, mountain peaks list, peak discovery, climbing destinations, mountain exploration, peak lists, summit finder",
      },
      "/map": {
        title: "Mountain Peak Map - SummitsTracker",
        description:
          "Interactive map showing mountain peaks worldwide. Visualize peak locations, track your climbs, and discover new summits to conquer with SummitsTracker.",
        keywords:
          "mountain map, peak map, climbing map, summit locations, peak visualization, interactive map, mountain geography",
      },
      "/leaderboard": {
        title: "Mountain Climbing Leaderboard - SummitsTracker",
        description:
          "View the mountain climbing leaderboard. See top climbers, track your ranking, and compete with the community on SummitsTracker.",
        keywords:
          "climbing leaderboard, mountaineering rankings, top climbers, peak achievements, climbing competition, summit rankings",
      },
      "/profile": {
        title: "Your Summit Profile - SummitsTracker",
        description:
          "Your personal summit profile. Track your achievements, view your peak statistics, and manage your climbing journey on SummitsTracker.",
        keywords:
          "summit profile, climbing profile, peak statistics, personal achievements, climbing journey, mountaineering stats",
      },
      "/help": {
        title: "Help & Support - SummitsTracker",
        description:
          "Get help and support for SummitsTracker. Find answers to common questions and learn how to use the platform.",
        keywords:
          "summitstracker help, support, FAQ, user guide, climbing app help",
      },
      "/contact": {
        title: "Contact Us - SummitsTracker",
        description:
          "Contact SummitsTracker. Get in touch with our team for support, feedback, or inquiries.",
        keywords:
          "contact summitstracker, support contact, feedback, inquiries",
      },
      "/terms-of-service": {
        title: "Terms of Service - SummitsTracker",
        description:
          "Terms of Service for SummitsTracker. Read our terms and conditions for using the platform.",
        keywords:
          "terms of service, terms and conditions, summitstracker terms",
      },
    };

    // Get route-specific metadata or use defaults
    const metadata =
      routeMetadata[location.pathname] ||
      routeMetadata["/"] ||
      (() => {
        const ogTitle = t("og.title");
        const ogDescription = t("og.description");
        return {
          title: ogTitle,
          description: ogDescription,
          keywords:
            "summitstracker, summits tracker, mountain peaks, climbing tracker, mountaineering",
        };
      })();

    const pageTitle = metadata.title;
    const pageDescription = metadata.description;
    const pageKeywords = metadata.keywords;

    // Update canonical URL
    updateLinkTag("canonical", currentUrl);

    // Update keywords
    updateNameMetaTag("keywords", pageKeywords);

    // Update Open Graph meta tags
    updateMetaTag("og:title", pageTitle);
    updateMetaTag("og:description", pageDescription);
    updateMetaTag("og:type", "website");
    updateMetaTag("og:url", currentUrl);
    updateMetaTag("og:image", ogImage);
    updateMetaTag("og:site_name", siteName);
    updateMetaTag("og:locale", getOpenGraphLocale(language));

    // Update Twitter Card meta tags
    updateNameMetaTag("twitter:card", "summary_large_image");
    updateNameMetaTag("twitter:title", pageTitle);
    updateNameMetaTag("twitter:description", pageDescription);
    updateNameMetaTag("twitter:image", ogImage);

    // Update standard meta description
    updateNameMetaTag("description", pageDescription);

    // Update page title
    updateTitle(pageTitle);
  }, [t, language, location.pathname]);

  // This component doesn't render anything visible
  return null;
};

export default DynamicMetaTags;
