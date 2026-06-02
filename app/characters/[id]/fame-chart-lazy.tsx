"use client";

import dynamic from "next/dynamic";

const FameChart = dynamic(
  () => import("./fame-chart").then((m) => m.FameChart),
  { ssr: false }
);

export { FameChart };
