"use client";

import dynamic from "next/dynamic";

const SeasonMapView = dynamic(() => import("@/components/map/SeasonMapView"), {
  loading: () => (
    <section
      aria-busy="true"
      aria-label="日本各地の季節の投稿を眺める地図"
      className="flex h-dvh min-h-[32rem] w-full items-center justify-center bg-canvas text-sm tracking-wider text-ink-muted"
      role="region"
    >
      地図を読み込んでいます…
    </section>
  ),
  ssr: false,
});

export default function SeasonMap() {
  return <SeasonMapView />;
}
