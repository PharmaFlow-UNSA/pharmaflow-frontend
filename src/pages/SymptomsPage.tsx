import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pill,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
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
        throw new Error("User id is required to run a symptom search.");
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
  });

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Stethoscope className="h-6 w-6 text-brand-600" />
            Symptom finder
          </h1>
          <p className="mt-1 text-slate-600">
            Describe what you are feeling and get pharmacy-ready product matches you can review with confidence.
          </p>
        </div>
      </div>

      {currentUserQuery.isError && <ErrorMessage error={currentUserQuery.error} />}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                Search symptoms
              </CardTitle>
              <CardDescription>Add one or more symptoms before finding product matches.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={submitSearch} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="symptomQuery">Symptom</Label>
                  <div className="flex gap-2">
                    <Input
                      id="symptomQuery"
                      value={draftQuery}
                      maxLength={100}
                      placeholder="e.g. fever, dry cough"
                      onChange={(event) => setDraftQuery(event.target.value)}
                    />
                    <Button type="submit" disabled={symptomQuery.isFetching}>
                      <Search className="mr-1.5 h-4 w-4" />
                      Search
                    </Button>
                  </div>
                </div>
              </form>

              {selectionError && (
                <p className="flex items-center gap-1.5 text-sm text-red-700">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selected symptoms</CardTitle>
              <CardDescription>These symptoms will be sent as one search.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedSymptoms.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No symptoms selected yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedSymptoms.map((symptom) => (
                    <button
                      key={symptom.id}
                      type="button"
                      onClick={() => removeSymptom(symptom.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      {symptom.name}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}

              {findProductsMutation.isError && <ErrorMessage error={findProductsMutation.error} />}

              <Button
                type="button"
                className="w-full"
                disabled={isFindingProducts || selectedSymptoms.length === 0 || !userId}
                onClick={findProducts}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {isFindingProducts ? "Finding products..." : "Find products"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" />
                Recommended products
              </CardTitle>
              <CardDescription>
                Product matches are ranked by relevance and should not be treated as a diagnosis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MatchResults
                matches={matches}
                selectedSymptoms={selectedSymptoms}
                activeSearch={activeSearch}
                isLoading={isFindingProducts}
                page={matchPage}
                onPageChange={setMatchPage}
              />
            </CardContent>
          </Card>
        </div>
      </section>
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
    return <ErrorMessage error={error} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!hasSearched) {
    return <p className="text-sm text-slate-500">Enter at least two characters to search.</p>;
  }

  if (symptoms.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
        No active symptoms matched that search.
      </p>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      {symptoms.map((symptom) => {
        const alreadySelected = selectedIds.has(symptom.id);
        return (
          <div
            key={symptom.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{symptom.name}</p>
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
  page,
  onPageChange,
}: {
  matches: EnrichedMatch[] | null;
  selectedSymptoms: SymptomDTO[];
  activeSearch: SymptomSearchDTO | null;
  isLoading: boolean;
  page: number;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(MATCHES_PER_PAGE)].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (matches === null) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
        <Pill className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">No search run yet</p>
        <p className="mt-1 text-sm text-slate-500">Select symptoms to find product matches.</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">No product matches found</p>
        <p className="mt-1 text-sm text-slate-500">
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
        <p className="text-sm text-slate-500">
          Search saved {formatInstant(activeSearch.searchedAt)}.
        </p>
      )}
      {paginatedMatches.map(({ match, product }, index) => (
        <article
          key={`${match.productId}-${startIndex + index}`}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Pill className="h-4 w-4 text-brand-600" />
                {product?.name ?? `Product #${match.productId}`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {product?.brandName ?? product?.manufacturer ?? "Product details unavailable"}
              </p>
            </div>
            <RelevanceBadge score={match.relevanceScore} />
          </div>

          {match.matchReason && (
            <p className="mt-3 text-sm text-slate-700">{match.matchReason}</p>
          )}

          <MatchedSymptoms match={match} selectedSymptoms={selectedSymptoms} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {product ? (
              <Link
                to={`/products/${product.id}/availability`}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Check availability
              </Link>
            ) : (
              <span className="text-sm text-slate-500">Product id: {match.productId}</span>
            )}
            {product?.requiresPrescription && <Badge variant="warning">Rx</Badge>}
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
