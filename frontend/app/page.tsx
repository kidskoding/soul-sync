import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFAF5]">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-xl font-bold tracking-tight text-[#3D2C2C]">
          SoulSync
        </span>
        <Link
          href="/auth"
          className="rounded-full border border-[#E8D5C4] px-5 py-2 text-sm font-medium text-[#3D2C2C] transition-colors hover:bg-[#F5E6D8]"
        >
          Sign in
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-16 text-center md:pt-28">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 inline-block rounded-full bg-[#F5E6D8] px-4 py-1.5 text-sm font-medium text-[#8B5E3C]">
            AI-powered dating for people who hate small talk
          </p>
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-[#3D2C2C] md:text-7xl">
            Your AI Twin Finds
            <br />
            <span className="bg-gradient-to-r from-[#E07A5F] to-[#C1666B] bg-clip-text text-transparent">
              Your Perfect Match
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#6B5B5B] md:text-xl">
            We create an AI version of you that goes on hundreds of
            conversations so you don&apos;t have to. When it finds someone
            truly compatible, you meet for real.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth"
              className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#E07A5F] to-[#C1666B] px-8 text-base font-semibold text-white shadow-lg shadow-[#E07A5F]/25 transition-all hover:shadow-xl hover:shadow-[#E07A5F]/30 hover:brightness-105"
            >
              Get Started — It&apos;s Free
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-medium text-[#6B5B5B] transition-colors hover:text-[#3D2C2C]"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="bg-white px-6 py-24 md:px-12"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-[#3D2C2C] md:text-4xl">
            How SoulSync Works
          </h2>
          <p className="mx-auto mb-16 max-w-lg text-center text-[#6B5B5B]">
            Four steps from sign-up to a real connection
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                emoji: "\uD83E\uDDE0",
                title: "Create Your Twin",
                desc: "A quick AI interview captures your personality, values, humor, and what you're really looking for.",
              },
              {
                step: "02",
                emoji: "\uD83D\uDCAC",
                title: "Twins Meet",
                desc: "Your AI twin has deep conversations with other twins — hundreds of them — exploring compatibility on your behalf.",
              },
              {
                step: "03",
                emoji: "\u2728",
                title: "Get Scored",
                desc: "Each conversation is scored across 5 dimensions: intellectual, emotional, lifestyle, humor, and values.",
              },
              {
                step: "04",
                emoji: "\u2615",
                title: "Meet IRL",
                desc: "Only the best matches reach you. Skip the small talk — you already know you'll click.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-[#F0E4D8] bg-[#FFFAF5] p-6 transition-all hover:border-[#E07A5F]/30 hover:shadow-lg hover:shadow-[#E07A5F]/5"
              >
                <div className="mb-4 text-4xl">{item.emoji}</div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#C1666B]">
                  Step {item.step}
                </p>
                <h3 className="mb-2 text-lg font-bold text-[#3D2C2C]">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B5B5B]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="bg-[#FFFAF5] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-[#3D2C2C] md:text-4xl">
            Why SoulSync?
          </h2>
          <p className="mx-auto mb-16 max-w-lg text-center text-[#6B5B5B]">
            Dating apps are broken. We&apos;re building something different.
          </p>

          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg
                    className="h-8 w-8 text-[#E07A5F]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                    />
                  </svg>
                ),
                title: "AI-Powered Matching",
                desc: "Not just photos and bios. Your twin understands your personality deeply and finds people who truly complement you.",
              },
              {
                icon: (
                  <svg
                    className="h-8 w-8 text-[#E07A5F]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                    />
                  </svg>
                ),
                title: "No Awkward Small Talk",
                desc: "Your twin handles the 'getting to know you' phase. By the time you meet, you already have things to talk about.",
              },
              {
                icon: (
                  <svg
                    className="h-8 w-8 text-[#E07A5F]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                ),
                title: "Deep Compatibility Scoring",
                desc: "Matches are scored across intellectual spark, emotional depth, lifestyle fit, humor, and shared values.",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDF0E9]">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#3D2C2C]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B5B5B]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-2xl rounded-3xl bg-gradient-to-br from-[#3D2C2C] to-[#5B3A3A] px-8 py-16 text-center shadow-2xl md:px-16">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to Meet Someone Real?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-[#D4B8A0]">
            Your AI twin is waiting to start conversations on your behalf.
            Sign up in 2 minutes, complete a quick interview, and let
            SoulSync do the rest.
          </p>
          <Link
            href="/auth"
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-[#3D2C2C] shadow-lg transition-all hover:shadow-xl hover:brightness-95"
          >
            Create Your AI Twin
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#F0E4D8] bg-[#FFFAF5] px-6 py-8 text-center text-sm text-[#8B7B7B]">
        <p>&copy; {new Date().getFullYear()} SoulSync. All rights reserved.</p>
      </footer>
    </div>
  );
}
