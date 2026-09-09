import React from "react";
import { useLocation } from "react-router-dom";

const StructuredData: React.FC = () => {
  const location = useLocation();
  const baseUrl = "https://summitstracker.com";
  const currentUrl = `${baseUrl}${location.pathname}`;

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SummitsTracker",
    url: baseUrl,
    logo: `${baseUrl}/icon-512.webp`,
    description:
      "SummitsTracker - Track your summit achievements, share peaks with the community, and discover climbs from other mountaineers around the world.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      url: `${baseUrl}/contact`,
    },
  };

  // WebSite Schema
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SummitsTracker",
    url: baseUrl,
    description:
      "Track your summit achievements, share peaks with the community, and discover climbs from other mountaineers around the world.",
    publisher: {
      "@type": "Organization",
      name: "SummitsTracker",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon-512.webp`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/explore?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // BreadcrumbList Schema
  const getBreadcrumbSchema = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbItems = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
    ];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const name = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      breadcrumbItems.push({
        "@type": "ListItem",
        position: index + 2,
        name: name,
        item: `${baseUrl}${currentPath}`,
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems,
    };
  };

  // WebPage Schema (for current page)
  const getWebPageSchema = () => {
    const pageTitles: Record<string, string> = {
      "/": "SummitsTracker - Track Your Mountain Peaks",
      "/explore": "Explore Mountain Peaks - SummitsTracker",
      "/map": "Mountain Peak Map - SummitsTracker",
      "/leaderboard": "Mountain Climbing Leaderboard - SummitsTracker",
      "/profile": "Your Summit Profile - SummitsTracker",
      "/help": "Help & Support - SummitsTracker",
      "/terms-of-service": "Terms of Service - SummitsTracker",
      "/contact": "Contact Us - SummitsTracker",
    };

    const pageDescriptions: Record<string, string> = {
      "/": "Track your summit achievements, share peaks with the community, and discover climbs from other mountaineers around the world.",
      "/explore":
        "Explore and discover amazing mountain peaks from around the world. Browse peak lists, view community achievements, and find your next climbing adventure.",
      "/map":
        "Interactive map showing mountain peaks worldwide. Visualize peak locations, track your climbs, and discover new summits to conquer.",
      "/leaderboard":
        "View the mountain climbing leaderboard. See top climbers, track your ranking, and compete with the community.",
      "/profile":
        "Your personal summit profile. Track your achievements, view your peak statistics, and manage your climbing journey.",
      "/help": "Get help and support for SummitsTracker. Find answers to common questions and learn how to use the platform.",
      "/terms-of-service":
        "Terms of Service for SummitsTracker. Read our terms and conditions for using the platform.",
      "/contact":
        "Contact SummitsTracker. Get in touch with our team for support, feedback, or inquiries.",
    };

    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: pageTitles[location.pathname] || "SummitsTracker",
      description:
        pageDescriptions[location.pathname] ||
        "SummitsTracker - Track your mountain peaks",
      url: currentUrl,
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: "SummitsTracker",
        url: baseUrl,
      },
    };
  };

  return (
    <>
      <script
        type="application/ld+json"
      >
        {JSON.stringify(organizationSchema)}
      </script>
      <script
        type="application/ld+json"
      >
        {JSON.stringify(websiteSchema)}
      </script>
      {location.pathname !== "/" && (
        <script
          type="application/ld+json"
        >
          {JSON.stringify(getBreadcrumbSchema())}
        </script>
      )}
      <script
        type="application/ld+json"
      >
        {JSON.stringify(getWebPageSchema())}
      </script>
    </>
  );
};

export default StructuredData;


