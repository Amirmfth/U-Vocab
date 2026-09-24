"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.info(
      JSON.stringify({
        event: "u_vocab.web_vital",
        route: window.location.pathname,
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
      }),
    );
  });

  return null;
}
