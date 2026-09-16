import SeasonMap from "@/components/map/SeasonMap";
import PostPinButton from "@/components/pin/PostPinButton";
import PinMapProvider from "@/components/shared/PinMapProvider";

export default function Home() {
  return (
    <PinMapProvider>
      <main className="relative isolate h-dvh min-h-[32rem] overflow-hidden">
        <header className="pointer-events-none fixed inset-x-2 top-2 z-30 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
          <div className="pointer-events-auto flex min-h-11 items-center border border-rule bg-control/95 px-2.5 shadow-[0_0.5rem_1.5rem_oklch(28%_0.03_245/0.14)] sm:px-3">
            <h1 className="flex shrink-0 items-center font-display text-lg font-bold tracking-[0.06em]">
              <span>四季彩MAP</span>
            </h1>
            <p className="ml-3 hidden border-l border-rule pl-3 text-xs tracking-wide text-ink-muted md:block">
              あなたの「いま」が、季節の便りになる。
            </p>
          </div>
          <PostPinButton />
        </header>

        <SeasonMap />

        <footer className="pointer-events-none fixed bottom-2 left-2 z-20 max-w-[calc(100%-7rem)] border border-rule bg-control/95 px-2.5 py-1.5 text-[0.68rem] leading-5 text-ink-muted sm:bottom-4 sm:left-4">
          匿名 · 位置は約100m単位 · 約21日で地図から消えます
        </footer>
      </main>
    </PinMapProvider>
  );
}
