"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCw, Search, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { CopyButton } from "@/components/shared/CopyButton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { formatDate, formatEnum } from "@/lib/format";

type TutorStatus = "STUDENT" | "GRADUATE";

interface Tutor {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  city: string;
  subcity: string;
  tutorStatus: TutorStatus;
  university: string | null;
  department: string | null;
  currentYear: string | null;
  currentGPA: number | null;
  fieldOfGraduation: string | null;
  universityGraduatedFrom: string | null;
  CGPA: number | null;
  employmentStatus: string | null;
  entrancePercentage: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    applications: number;
  };
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All tutors" },
  { value: "STUDENT", label: "Students" },
  { value: "GRADUATE", label: "Graduates" },
];

function affiliationOf(tutor: Tutor): string {
  if (tutor.tutorStatus === "STUDENT") {
    return tutor.university || "—";
  }

  return tutor.universityGraduatedFrom || tutor.fieldOfGraduation || "—";
}

function gpaOf(tutor: Tutor): string {
  const value =
    tutor.tutorStatus === "STUDENT" ? tutor.currentGPA : tutor.CGPA;

  return value !== null ? value.toFixed(2) : "—";
}

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /* Debounced so typing does not fire a request per keystroke. Every state
       update happens after an await, since setting state synchronously inside
       an effect causes a cascading re-render. */
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (filterStatus !== "ALL") {
          params.set("status", filterStatus);
        }

        const response = await fetch(
          `/api/admin/tutors?${params.toString()}`
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch tutors.");
        }

        setTutors(data.tutors);
        setError("");
      } catch (loadError) {
        if (!cancelled) {
          /* A failed load used to be swallowed into `console.error`, leaving
             the page showing a confident "0 tutors". */
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to fetch tutors."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, filterStatus, reloadKey]);

  function retry() {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  }

  function clearFilters() {
    setSearch("");
    setFilterStatus("ALL");
    setLoading(true);
  }

  const hasFilters = Boolean(search.trim()) || filterStatus !== "ALL";

  const columns: DataTableColumn<Tutor>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        mobileTitle: true,
        cell: (tutor) => (
          <div className="min-w-0">
            <Link
              href={`/admin/tutors/${tutor.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {tutor.fullName}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {tutor.email}
            </p>
          </div>
        ),
      },
      {
        id: "phone",
        header: "Phone",
        cell: (tutor) => (
          <CopyButton
            value={tutor.phone}
            variant="ghost"
            size="sm"
            successMessage="Phone number copied"
            className="-ml-2 font-normal"
          >
            {tutor.phone}
          </CopyButton>
        ),
      },
      {
        id: "status",
        header: "Type",
        cell: (tutor) => formatEnum(tutor.tutorStatus),
      },
      {
        id: "affiliation",
        header: "University",
        cell: (tutor) => (
          <span className="block max-w-48 truncate">
            {affiliationOf(tutor)}
          </span>
        ),
      },
      {
        id: "gpa",
        header: "GPA / CGPA",
        cellClassName: "tabular-nums",
        cell: gpaOf,
      },
      {
        id: "entrance",
        header: "Entrance %",
        cellClassName: "tabular-nums",
        cell: (tutor) => `${tutor.entrancePercentage.toFixed(1)}%`,
      },
      {
        id: "location",
        header: "Location",
        cell: (tutor) => `${tutor.city}, ${tutor.subcity}`,
      },
      {
        id: "applications",
        header: "Applications",
        headClassName: "text-right",
        cellClassName: "text-right tabular-nums",
        cell: (tutor) => tutor._count.applications,
      },
      {
        id: "joined",
        header: "Joined",
        cell: (tutor) => formatDate(tutor.createdAt),
      },
      {
        id: "actions",
        header: "",
        hideOnMobile: true,
        headClassName: "text-right",
        cellClassName: "text-right",
        cell: (tutor) => (
          <Button
            render={<Link href={`/admin/tutors/${tutor.id}`} />}
            variant="outline"
            size="sm"
          >
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutors"
        description={
          loading
            ? "Loading tutors…"
            : `${tutors.length} ${
                tutors.length === 1 ? "tutor" : "tutors"
              } registered`
        }
      />

      {/* -----------------------------------------------------
          FILTERS
      ----------------------------------------------------- */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or phone"
              aria-label="Search tutors"
              className="pl-9"
            />
          </div>

          <Select
            items={STATUS_OPTIONS}
            value={filterStatus}
            onValueChange={(value) =>
              setFilterStatus((value as string) ?? "ALL")
            }
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter by tutor type"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button
              variant="ghost"
              size="default"
              onClick={clearFilters}
              className="shrink-0"
            >
              <X data-icon="inline-start" aria-hidden="true" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load tutors"
          description={error}
          action={
            <Button onClick={retry} size="lg">
              <RotateCw data-icon="inline-start" aria-hidden="true" />
              Try again
            </Button>
          }
        />
      ) : (
        <DataTable
          items={tutors}
          columns={columns}
          getRowKey={(tutor) => tutor.id}
          caption="Registered tutors"
          empty={
            <EmptyState
              icon={hasFilters ? <Search /> : <Users />}
              title={hasFilters ? "No matching tutors" : "No tutors yet"}
              description={
                hasFilters
                  ? "No tutors match the current search or filter."
                  : "Registered tutors will appear here."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="lg" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </div>
  );
}
