"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Login failed."
        );

        return;
      }

      router.push("/tutor");
      router.refresh();
    } catch {
      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-white shadow-xl lg:grid-cols-2">

          {/* Left Side */}

          <div className="hidden bg-black p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link
                href="/"
                className="text-xl font-bold"
              >
                Excellence Tutor
              </Link>

              <div className="mt-24">
                <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
                  Tutor Portal
                </p>

                <h1 className="mt-4 text-4xl font-bold leading-tight">
                  Your next teaching
                  opportunity starts here.
                </h1>

                <p className="mt-6 max-w-md text-gray-400">
                  Sign in to explore available
                  tutoring opportunities, manage
                  your applications, and keep your
                  tutor profile up to date.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Excellence Tutor Hub
            </p>
          </div>

          {/* Login */}

          <div className="p-8 sm:p-12">
            <div className="mx-auto max-w-md">

              <div className="lg:hidden">
                <Link
                  href="/"
                  className="text-xl font-bold"
                >
                  Excellence Tutor
                </Link>
              </div>

              <div className="mt-8 lg:mt-0">
                <p className="text-sm font-medium text-gray-500">
                  Welcome back
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  Sign in to your account
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                  Access jobs and manage your
                  tutoring applications.
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-sm font-medium text-gray-500 hover:text-black"
                      onClick={() =>
                        setError(
                          "Password recovery will be available in a later authentication milestone."
                        )
                      }
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder="Enter your password"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-20 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm font-medium text-gray-500 hover:text-black"
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-gray-500">
                Don't have a tutor account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-black hover:underline"
                >
                  Create one
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}