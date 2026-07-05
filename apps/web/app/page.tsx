import { Sparkles } from "lucide-react";
import { HomeGrid } from "@/components/HomeGrid";

export default function HomePage() {
  return (
    <>
      <section className="relative">
        <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-14 text-center sm:px-6 sm:pt-20">
          <span className="pill mx-auto mb-6 w-fit bg-white text-ink-600 shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            30+ free PDF tools · No sign-up required
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
            Every <span className="text-brand-500">PDF tool</span> you need,
            <br className="hidden sm:block" /> in one place
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-500">
            Merge, split, compress, convert, edit and sign your documents. Fast,
            private, and free to start — no account required.
          </p>
        </div>
      </section>
      <HomeGrid />
    </>
  );
}
