import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-gray-950">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-xl">

        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

          {/* Logo */}

          <Link href="/" className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white shadow-sm">
              <GraduationCap size={22} />
            </div>

            <div>
              <div className="text-[17px] font-bold tracking-tight">
                Excellence Tutor
              </div>

              <div className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:block">
                Learn • Teach • Grow
              </div>
            </div>

          </Link>


          {/* Desktop navigation */}

          <nav className="hidden items-center gap-8 md:flex">

            <Link
              href="/jobs"
              className="text-sm font-medium text-gray-600 transition hover:text-black"
            >
              Find Jobs
            </Link>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 transition hover:text-black"
            >
              How It Works
            </a>

            <a
              href="#why-us"
              className="text-sm font-medium text-gray-600 transition hover:text-black"
            >
              Why Us
            </a>

          </nav>


          {/* Authentication */}

          <div className="flex items-center gap-2">

            <Link
              href="/login"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 sm:block"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              Register
              <ArrowRight size={15} />
            </Link>

          </div>

        </div>

      </header>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative isolate">

        {/* Background decoration */}

        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">

          <div className="absolute left-1/2 -top-62.5 h- 150 w-225 -translate-x-1/2 rounded-full bg-gray-100 blur-3xl" />

          <div className="absolute right-50 top-75 h-100 w-100 rounded-full bg-gray-50 blur-3xl" />

          <div className="absolute -left-50 top-125 h-100 w-100 rounded-full bg-gray-50 blur-3xl" />

        </div>


        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-2 lg:gap-20 lg:pb-32 lg:pt-28">


          {/* =================================================
              HERO TEXT
          ================================================== */}

          <div>

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">

              <Sparkles size={15} />

              A smarter way to find tutoring opportunities

            </div>


            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-[68px]">

              Turn your
              <span className="block text-gray-400">
                knowledge into
              </span>

              opportunity.

            </h1>


            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-600 sm:text-xl">

              Excellence Tutor connects qualified tutors with
              meaningful teaching opportunities. Create your profile,
              discover jobs, and apply with confidence.

            </p>


            {/* CTA */}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">

              <Link
                href="/jobs"
                className="group flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 font-semibold text-white shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:bg-gray-800"
              >

                Explore Jobs

                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />

              </Link>


              <Link
                href="/register"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3.5 font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
              >

                Become a Tutor

              </Link>

            </div>


            {/* Trust indicators */}

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500">

              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                One profile
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Easy applications
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} />
                Track applications
              </div>

            </div>

          </div>


          {/* =================================================
              HERO IMAGE
          ================================================== */}

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">

            {/* Main image frame */}

            <div className="relative overflow-hidden rounded-[32px] border border-gray-200 bg-gray-100 p-2 shadow-2xl shadow-gray-300/40">

              <div className="relative aspect-5/5 overflow-hidden rounded-[26px]">

                <Image
                  src="/images/tutor-image.jpg"
                  alt="Tutor helping a student"
                  fill
                  priority
                  className="object-cover transition duration-700 hover:scale-105"
                />

                {/* Image gradient */}

                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/5 to-transparent" />


              </div>

            </div>


            {/* =================================================
                FLOATING CARD — PROFILE
            ================================================== */}

            <div className="absolute -left-6 bottom-12 hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:block">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <UserRound size={20} />
                </div>

                <div>

                  <p className="text-sm font-bold">
                    Your Tutor Profile
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Create once • Apply easily
                  </p>

                </div>

              </div>

            </div>


            {/* =================================================
                FLOATING CARD — OPPORTUNITIES
            ================================================== */}

            <div className="absolute -right-5 top-12 hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:block">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <Search size={20} />
                </div>

                <div>

                  <p className="text-sm font-bold">
                    Discover Opportunities
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Search • Apply • Grow
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          VALUE STRIP
      ====================================================== */}

      <section className="border-y border-gray-100 bg-gray-50">

        <div className="mx-auto grid max-w-7xl divide-y divide-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

          <Value
            icon={<UserRound size={20} />}
            title="Build your profile"
            description="Keep your qualifications and experience organized."
          />

          <Value
            icon={<Search size={20} />}
            title="Find the right opportunity"
            description="Explore tutoring jobs that match your skills."
          />

          <Value
            icon={<ShieldCheck size={20} />}
            title="Apply with confidence"
            description="Submit applications using your saved information."
          />

        </div>

      </section>


      {/* =====================================================
          WHY US
      ====================================================== */}

      <section
        id="why-us"
        className="mx-auto max-w-7xl px-6 py-24 lg:py-32"
      >

        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">

          <div>

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
              Why Excellence Tutor
            </p>

            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need to grow as a tutor.
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-gray-600">
              We've designed the experience around what tutors
              actually need: less repetition, better organization,
              and easier access to opportunities.
            </p>

          </div>


          <div className="grid gap-5 sm:grid-cols-2">

            <Feature
              icon={<UserRound size={21} />}
              title="One professional profile"
              description="Your education, experience, contact information, and documents stay organized in one place."
            />

            <Feature
              icon={<Search size={21} />}
              title="Explore real opportunities"
              description="Browse available tutoring positions and discover jobs that fit your qualifications."
            />

            <Feature
              icon={<ShieldCheck size={21} />}
              title="Simple applications"
              description="Apply without repeatedly entering the same personal and academic information."
            />

            <Feature
              icon={<BookOpen size={21} />}
              title="Manage your journey"
              description="Keep track of your applications and stay organized throughout the process."
            />

          </div>

        </div>

      </section>


      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        id="how-it-works"
        className="border-y border-gray-100 bg-gray-50"
      >

        <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">

          <div className="max-w-2xl">

            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
              How it works
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              From your profile to your next opportunity.
            </h2>

            <p className="mt-5 leading-7 text-gray-600">
              A simple process designed to help you spend less
              time filling forms and more time teaching.
            </p>

          </div>


          <div className="mt-14 grid gap-5 md:grid-cols-4">

            <Process
              number="01"
              title="Create your account"
              description="Register and create your professional tutor profile."
            />

            <Process
              number="02"
              title="Explore jobs"
              description="Find tutoring opportunities that match your skills."
            />

            <Process
              number="03"
              title="Apply"
              description="Review your information and submit your application."
            />

            <Process
              number="04"
              title="Track"
              description="Follow your applications from your dashboard."
            />

          </div>

        </div>

      </section>


      {/* =====================================================
          FINAL CTA
      ====================================================== */}

      <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32">

        <div className="relative overflow-hidden rounded-[32px] bg-black px-7 py-16 text-center text-white sm:px-12 lg:px-20">

          {/* Decorative circles */}

          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border border-white/10" />

          <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full border border-white/10" />

          <div className="relative">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
              <GraduationCap size={26} />
            </div>

            <h2 className="mx-auto mt-7 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Your next teaching opportunity starts here.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">
              Create your tutor profile today and start exploring
              opportunities through Excellence Tutor.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

              <Link
                href="/register"
                className="group flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-black transition hover:bg-gray-100"
              >

                Create Your Profile

                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />

              </Link>

              <Link
                href="/jobs"
                className="rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Explore Jobs
              </Link>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="border-t border-gray-100">

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white">
              <GraduationCap size={18} />
            </div>

            <div>

              <p className="text-sm font-bold">
                Excellence Tutor
              </p>

              <p className="text-xs text-gray-400">
                Learn • Teach • Grow
              </p>

            </div>

          </div>


          <div className="flex flex-wrap gap-6 text-sm text-gray-500">

            <Link
              href="/jobs"
              className="transition hover:text-black"
            >
              Find Jobs
            </Link>

            <Link
              href="/login"
              className="transition hover:text-black"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="transition hover:text-black"
            >
              Register
            </Link>

          </div>


          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Excellence Tutor
          </p>

        </div>

      </footer>

    </main>
  );
}


/* =========================================================
   VALUE
========================================================= */

function Value({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 px-6 py-8 sm:px-10">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        {icon}
      </div>

      <div>

        <h3 className="font-bold">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-gray-600">
          {description}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   FEATURE
========================================================= */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 transition group-hover:bg-black group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-5 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {description}
      </p>

    </div>
  );
}


/* =========================================================
   PROCESS
========================================================= */

function Process({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50">

      <div className="flex items-center justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold transition group-hover:bg-black group-hover:text-white">
          {number}
        </div>

        <ArrowRight
          size={18}
          className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-black"
        />

      </div>

      <h3 className="mt-7 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {description}
      </p>

    </div>
  );
}

