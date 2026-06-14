import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { getProductById } from "@/api/products";
import {
  addSymptomSearchItem,
  createSymptomSearch,
  getSymptomSearchMatches,
  searchSymptoms,
} from "@/api/symptoms";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getProductImage } from "@/lib/catalog";
import { showApiErrorToast } from "@/lib/errors";
import { formatInstant } from "@/lib/utils";
import type {
  ProductDTO,
  SymptomDTO,
  SymptomProductMatchDTO,
  SymptomSearchDTO,
  SymptomSeverityLevel,
} from "@/types/api";

const symptomLookupSchema = z
  .string()
  .trim()
  .min(2, "Search must be at least 2 characters.")
  .max(100, "Search must be at most 100 characters.");

const symptomSearchSchema = z
  .string()
  .trim()
  .min(2, "Search summary must be at least 2 characters.")
  .max(255, "Search summary must be at most 255 characters.");

const severityVariant: Record<SymptomSeverityLevel, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

const MATCHES_PER_PAGE = 3;

interface EnrichedMatch {
  match: SymptomProductMatchDTO;
  product?: ProductDTO;
}

export function SymptomsPage() {
  const { user } = useAuth();
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomDTO[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [matches, setMatches] = useState<EnrichedMatch[] | null>(null);
  const [matchPage, setMatchPage] = useState(1);
  const [activeSearch, setActiveSearch] = useState<SymptomSearchDTO | null>(null);
  const [lastSearchErrorToastQuery, setLastSearchErrorToastQuery] = useState("");

  const currentUserQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const userId = user?.userId ?? currentUserQuery.data?.id;
  const patientProfileId = currentUserQuery.data?.patientProfile?.id;

  const symptomQuery = useQuery({
    queryKey: ["symptoms", "search", submittedQuery],
    queryFn: () => searchSymptoms(submittedQuery),
    enabled: submittedQuery.length >= 2,
  });

  const selectedIds = useMemo(
    () => new Set(selectedSymptoms.map((symptom) => symptom.id)),
    [selectedSymptoms]
  );

  const findProductsMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Please sign in before running a symptom search.");
      }
      if (selectedSymptoms.length === 0) {
        throw new Error("Select at least one symptom before finding products.");
      }

      const searchQuery = symptomSearchSchema.parse(
        selectedSymptoms.map((symptom) => symptom.name).join(", ")
      );
      const search = await createSymptomSearch({
        userId,
        patientProfileId,
        searchQuery,
      });

      await Promise.all(
        selectedSymptoms.map((symptom) =>
          addSymptomSearchItem(search.id, {
            symptomId: symptom.id,
          })
        )
      );

      const foundMatches = await getSymptomSearchMatches(search.id);
      const enrichedMatches = await Promise.all(
        foundMatches.map(async (match) => {
          try {
            const product = await getProductById(match.productId);
            return { match, product };
          } catch {
            return { match };
          }
        })
      );

      return { search, matches: enrichedMatches };
    },
    onSuccess: (result) => {
      setActiveSearch(result.search);
      setMatches(result.matches);
      setMatchPage(1);
      setSelectionError(null);
    },
    onError: (error) => {
      showApiErrorToast(error, "Could not find product matches. Please try again.");
    },
  });

  useEffect(() => {
    if (symptomQuery.isError && submittedQuery && submittedQuery !== lastSearchErrorToastQuery) {
      showApiErrorToast(symptomQuery.error, "Could not search symptoms. Please try again.");
      setLastSearchErrorToastQuery(submittedQuery);
    }
  }, [lastSearchErrorToastQuery, submittedQuery, symptomQuery.error, symptomQuery.isError]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const result = symptomLookupSchema.safeParse(draftQuery);
    if (!result.success) {
      setSelectionError(result.error.issues[0]?.message ?? "Enter a valid symptom search.");
      setSubmittedQuery("");
      return;
    }
    setSelectionError(null);
    setSubmittedQuery(result.data);
  };

  const addSymptom = (symptom: SymptomDTO) => {
    if (selectedIds.has(symptom.id)) {
      setSelectionError("That symptom is already selected.");
      return;
    }
    setSelectedSymptoms((current) => [...current, symptom]);
    setSelectionError(null);
    setMatches(null);
    setMatchPage(1);
    setActiveSearch(null);
  };

  const removeSymptom = (symptomId: number) => {
    setSelectedSymptoms((current) => current.filter((symptom) => symptom.id !== symptomId));
    setMatches(null);
    setMatchPage(1);
    setActiveSearch(null);
  };

  const findProducts = () => {
    if (selectedSymptoms.length === 0) {
      setSelectionError("Select at least one symptom before finding products.");
      return;
    }
    setSelectionError(null);
    findProductsMutation.mutate();
  };

  const isFindingProducts = findProductsMutation.isPending;

  return (
    <div className="space-y-7 animate-section">
      <section className="relative overflow-hidden rounded-[2rem] border border-brand-100 bg-[radial-gradient(circle_at_80%_18%,rgba(14,165,233,0.18),transparent_27%),radial-gradient(circle_at_28%_88%,rgba(34,197,94,0.2),transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_55%,#eaf8ff_100%)] p-6 shadow-sm lg:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-[2rem] bg-brand-200/40 rotate-6" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
              Smart care tool
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-800 sm:text-4xl">
              Symptom finder
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">
              Describe what you are feeling and review pharmacy-ready product matches. Results are
              informational and not a diagnosis.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-brand-950/10 backdrop-blur">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Stethoscope className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-extrabold text-ink-800">Care-aware matching</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select symptoms first, then review ranked product references and match context.
            </p>
          </div>
        </div>
      </section>

      {currentUserQuery.isError && <ErrorMessage error={currentUserQuery.error} />}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[1.75rem] border-brand-100 shadow-md shadow-slate-900/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-ink-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <Search className="h-5 w-5" />
                </span>
                Search symptoms
              </CardTitle>
              <CardDescription className="leading-6">
                Add one or more symptoms before finding product matches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={submitSearch} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="symptomQuery" className="text-sm font-bold text-ink-800">
                    Symptom
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="symptomQuery"
                      value={draftQuery}
                      maxLength={100}
                      placeholder="e.g. fever, dry cough"
                      className="h-12 rounded-2xl px-4 text-base"
                      onChange={(event) => setDraftQuery(event.target.value)}
                      aria-describedby="symptomQueryHelp"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-12 rounded-2xl font-bold"
                      disabled={symptomQuery.isFetching}
                    >
                      {symptomQuery.isFetching ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-1.5 h-4 w-4" />
                      )}
                      {symptomQuery.isFetching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  <p id="symptomQueryHelp" className="text-sm text-slate-500">
                    Enter at least 2 characters. Try a specific symptom such as headache or sore throat.
                  </p>
                </div>
              </form>

              {selectionError && (
                <p
                  className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4" />
                  {selectionError}
                </p>
              )}

              <SymptomResults
                symptoms={symptomQuery.data ?? []}
                hasSearched={submittedQuery.length >= 2}
                isLoading={symptomQuery.isLoading || symptomQuery.isFetching}
                isError={symptomQuery.isError}
                error={symptomQuery.error}
                selectedIds={selectedIds}
                onAdd={addSymptom}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.75rem] border-brand-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fffb_100%)] shadow-md shadow-slate-900/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-ink-800">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <ClipboardList className="h-5 w-5" />
                </span>
                Selected symptoms
              </CardTitle>
              <CardDescription className="leading-6">These symptoms will be sent as one search.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSymptoms.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-brand-200 bg-brand-50/40 px-4 py-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-ink-800">No symptoms selected yet</p>
                  <p className="mt-1 text-sm text-slate-600">Search above and add at least one symptom.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map((symptom) => (
                    <button
                      key={symptom.id}
                      type="button"
                      onClick={() => removeSymptom(symptom.id)}
                      aria-label={`Remove ${symptom.name}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-100 transition-all hover:-translate-y-0.5 hover:bg-brand-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:hover:translate-y-0"
                    >
                      <span>{symptom.name}</span>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}

              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-2xl font-bold"
                disabled={isFindingProducts || selectedSymptoms.length === 0 || !userId}
                onClick={findProducts}
              >
                {isFindingProducts ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                {isFindingProducts ? "Finding products..." : "Find products"}
              </Button>
              {!userId && (
                <p className="text-center text-sm text-slate-500">Sign in is required before matching products.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[1.75rem] border-brand-100 shadow-md shadow-slate-900/[0.04]">
            <CardHeader className="border-b border-brand-100 bg-brand-50/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl text-ink-800">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    Recommended products
                  </CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    Product matches are ranked by relevance and should not be treated as a diagnosis.
                  </CardDescription>
                </div>
                {matches && matches.length > 0 && (
                  <Badge variant="info" className="w-fit bg-white text-brand-700 shadow-sm">
                    {matches.length} {matches.length === 1 ? "result" : "results"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <MatchResults
                matches={matches}
                selectedSymptoms={selectedSymptoms}
                activeSearch={activeSearch}
                isLoading={isFindingProducts}
                error={findProductsMutation.error}
                isError={findProductsMutation.isError}
                onRetry={findProducts}
                page={matchPage}
                onPageChange={setMatchPage}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <span className="font-bold">Symptom discovery is informational and not a diagnosis.</span>{" "}
          Seek urgent medical care for severe, persistent, or worsening symptoms.
        </p>
      </div>
    </div>
  );
}

function SymptomResults({
  symptoms,
  hasSearched,
  isLoading,
  isError,
  error,
  selectedIds,
  onAdd,
}: {
  symptoms: SymptomDTO[];
  hasSearched: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  selectedIds: Set<number>;
  onAdd: (symptom: SymptomDTO) => void;
}) {
  if (isError) {
    return (
      <div className="rounded-[1.5rem] border border-red-100 bg-red-50 p-4">
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Loading symptom results">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-20 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-600">
        Enter at least two characters to search.
      </div>
    );
  }

  if (symptoms.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-brand-200 bg-brand-50/40 px-4 py-6 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
          <Search className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-extrabold text-ink-800">No active symptoms found</p>
        <p className="mt-1 text-sm text-slate-600">Try a different term or a simpler symptom name.</p>
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {symptoms.map((symptom) => {
        const alreadySelected = selectedIds.has(symptom.id);
        return (
          <div
            key={symptom.id}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-ink-800 group-hover:text-brand-700">{symptom.name}</p>
                {symptom.severityLevel && (
                  <Badge variant={severityVariant[symptom.severityLevel]}>
                    {symptom.severityLevel.toLowerCase()}
                  </Badge>
                )}
              </div>
              {symptom.description && (
                <p className="line-clamp-2 text-sm text-slate-600">{symptom.description}</p>
              )}
              {symptom.tags && symptom.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {symptom.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl font-bold"
              disabled={alreadySelected}
              onClick={() => onAdd(symptom)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {alreadySelected ? "Added" : "Add"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function MatchResults({
  matches,
  selectedSymptoms,
  activeSearch,
  isLoading,
  isError,
  error,
  onRetry,
  page,
  onPageChange,
}: {
  matches: EnrichedMatch[] | null;
  selectedSymptoms: SymptomDTO[];
  activeSearch: SymptomSearchDTO | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading recommended products">
        {[...Array(MATCHES_PER_PAGE)].map((_, index) => (
          <div key={index} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              <div className="h-20 w-20 rounded-2xl skeleton-shimmer" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-2/3 rounded-full skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded-full skeleton-shimmer" />
                <div className="h-3 w-full rounded-full skeleton-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[1.5rem] border border-red-100 bg-red-50 p-5" role="alert">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 ring-1 ring-red-100">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-red-900">Could not load recommendations</p>
            <div className="mt-2 text-sm text-red-800">
              <ErrorMessage error={error} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl bg-white"
              onClick={onRetry}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (matches === null) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-brand-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_100%)] px-5 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
          <Pill className="h-8 w-8" />
        </div>
        <p className="mt-4 font-extrabold text-ink-800">No search run yet</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Select symptoms to find product matches.</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          <AlertCircle className="h-8 w-8" />
        </div>
        <p className="mt-4 font-extrabold text-ink-800">No product matches found</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Try a different symptom combination or ask a pharmacist for guidance.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * MATCHES_PER_PAGE;
  const paginatedMatches = matches.slice(startIndex, startIndex + MATCHES_PER_PAGE);
  const showingStart = startIndex + 1;
  const showingEnd = Math.min(startIndex + MATCHES_PER_PAGE, matches.length);

  return (
    <div className="space-y-3">
      {activeSearch && (
        <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Search saved {formatInstant(activeSearch.searchedAt)}.
        </p>
      )}
      {paginatedMatches.map(({ match, product }, index) => (
        <article
          key={`${match.productId}-${startIndex + index}`}
          className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md motion-reduce:hover:translate-y-0"
        >
          <div className="grid gap-4 p-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
            <div className="flex h-24 min-h-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50 p-3">
              {product ? (
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="max-h-20 max-w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <Pill className="h-8 w-8 text-brand-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-base font-extrabold text-ink-800">
                    {product?.name ?? `Product #${match.productId}`}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {product?.brandName ?? product?.manufacturer ?? "Product details unavailable"}
                  </p>
                </div>
                <RelevanceBadge score={match.relevanceScore} />
              </div>

              {match.matchReason && (
                <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                  {match.matchReason}
                </p>
              )}

              <MatchedSymptoms match={match} selectedSymptoms={selectedSymptoms} />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {product ? (
                  <>
                    <Link
                      to={`/products/${product.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-ink-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      View details
                    </Link>
                    <Link
                      to={`/products/${product.id}/availability`}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      Check availability
                    </Link>
                  </>
                ) : (
                  <span className="text-sm text-slate-500">Product reference: {match.productId}</span>
                )}
                {product?.requiresPrescription && <Badge variant="warning">Rx</Badge>}
              </div>
            </div>
          </div>
        </article>
      ))}

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {showingStart}-{showingEnd} of {matches.length} recommendations
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RelevanceBadge({ score }: { score?: number | null }) {
  if (score == null) {
    return <Badge variant="outline">Relevance unavailable</Badge>;
  }

  const percentage = Math.round(score * 100);
  return (
    <Badge
      variant={percentage >= 75 ? "success" : percentage >= 45 ? "warning" : "info"}
      className="shrink-0"
    >
      {percentage}% relevance
    </Badge>
  );
}

function MatchedSymptoms({
  match,
  selectedSymptoms,
}: {
  match: SymptomProductMatchDTO;
  selectedSymptoms: SymptomDTO[];
}) {
  const matchedIds = match.matchedSymptomIds ?? (match.symptomId ? [match.symptomId] : []);
  const matchedSymptoms = selectedSymptoms.filter((symptom) => matchedIds.includes(symptom.id));

  if (matchedSymptoms.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {matchedSymptoms.map((symptom) => (
        <Badge key={symptom.id} variant="outline">
          {symptom.name}
        </Badge>
      ))}
    </div>
  );
}
