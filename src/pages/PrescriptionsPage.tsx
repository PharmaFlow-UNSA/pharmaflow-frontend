import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Plus, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  createPrescription,
  getPrescriptions,
  reviewPrescription,
} from "@/api/prescriptions";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatInstant } from "@/lib/utils";
import { useToast } from "@/toast/useToast";
import {
  PRESCRIPTION_STATUS_LABELS,
  type PrescriptionDTO,
  type PrescriptionStatus,
} from "@/types/api";

const STATUS_VARIANT: Record<PrescriptionStatus, "info" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const uploadSchema = z.object({
  imageUrl: z
    .string()
    .url("Must be a valid URL")
    .max(500, "Max 500 characters"),
});
type UploadForm = z.infer<typeof uploadSchema>;

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewerNotes: z.string().max(500, "Max 500 characters").optional(),
});
type ReviewForm = z.infer<typeof reviewSchema>;

export function PrescriptionsPage() {
  const { hasRole } = useAuth();
  const isReviewer = hasRole("ROLE_DOCTOR", "ROLE_PHARMACIST", "ROLE_ADMIN");
  const toast = useToast();

  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "">("");
  const [page, setPage] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewing, setReviewing] = useState<PrescriptionDTO | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  // Patients see only their own; reviewers see everything (optionally filtered).
  const listQuery = useQuery({
    queryKey: [
      "prescriptions",
      { isReviewer, userId: currentUser?.id, status: statusFilter, page },
    ],
    queryFn: () =>
      getPrescriptions({
        page,
        size: 10,
        sort: "uploadedAt,desc",
        userId: isReviewer ? undefined : currentUser?.id,
        status: statusFilter || undefined,
      }),
    enabled: isReviewer || !!currentUser?.id,
    placeholderData: keepPreviousData,
  });

  // ── Upload form ────────────────────────────────────────────────────────
  const uploadForm = useForm<UploadForm>({ resolver: zodResolver(uploadSchema) });

  const uploadMutation = useMutation({
    mutationFn: (values: UploadForm) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      return createPrescription({ userId: currentUser.id, imageUrl: values.imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      setUploadOpen(false);
      uploadForm.reset();
      toast.success("Prescription uploaded for review.");
    },
    onError: () => {
      toast.error("Could not upload the prescription.");
    },
  });

  // ── Review form ────────────────────────────────────────────────────────
  const reviewForm = useForm<ReviewForm>({ resolver: zodResolver(reviewSchema) });
  const reviewStatus = useWatch({ control: reviewForm.control, name: "status" });

  const reviewMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: ReviewForm }) =>
      reviewPrescription(id, values.status, values.reviewerNotes),
    onSuccess: (_rx, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      setReviewing(null);
      reviewForm.reset();
      toast.success(variables.values.status === "APPROVED" ? "Prescription approved." : "Prescription rejected.");
    },
    onError: () => {
      toast.error("Could not update the prescription review.");
    },
  });

  function openReview(rx: PrescriptionDTO, status: "APPROVED" | "REJECTED") {
    setReviewing(rx);
    reviewForm.reset({ status, reviewerNotes: "" });
  }

  const prescriptions = listQuery.data?.content ?? [];
  const approvedCount = prescriptions.filter((rx) => rx.status === "APPROVED").length;
  const pendingCount = prescriptions.filter((rx) => rx.status === "PENDING").length;
  const rejectedCount = prescriptions.filter((rx) => rx.status === "REJECTED").length;

  return (
    <div className="space-y-7 animate-section">
      <AdminPageHeader
        eyebrow={isReviewer ? "Prescription operations" : "My Care"}
        title="Prescriptions"
        description={
          isReviewer
            ? "Review uploaded prescriptions, approve or reject pending records, and keep fulfillment moving."
            : "Upload prescription image links for products that require one."
        }
        icon={FileText}
        tone={isReviewer ? "dark" : "light"}
        stats={
          listQuery.data
            ? [
                { label: "Total", value: listQuery.data.totalElements },
                { label: "Approved here", value: approvedCount },
                { label: "Pending here", value: pendingCount },
                { label: "Rejected here", value: rejectedCount },
              ]
            : undefined
        }
        action={
          !isReviewer ? (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Upload prescription
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PrescriptionStatus | "");
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
        {isReviewer && (
          <p className="text-xs text-slate-500">
            Reviewer view — showing prescriptions across accounts.
          </p>
        )}
      </div>

      {listQuery.isError && <ErrorMessage error={listQuery.error} />}
      {listQuery.isLoading && (
        <div className="grid gap-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-28 skeleton-shimmer rounded-[1.75rem]" />
          ))}
        </div>
      )}

      {listQuery.data && listQuery.data.content.length === 0 && (
        <EmptyState
          title="No prescriptions match these filters"
          description="Try another status or upload a prescription."
          icon={FileText}
        />
      )}

      {listQuery.data && listQuery.data.content.length > 0 && (
        <div className="space-y-3">
          {listQuery.data.content.map((rx) => (
            <Card key={rx.id} className="hover-lift hover:border-brand-200 hover:shadow-md">
              <CardHeader className="flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Prescription #{rx.id}</CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Account record · uploaded {formatInstant(rx.uploadedAt)}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[rx.status]}>
                  {PRESCRIPTION_STATUS_LABELS[rx.status]}
                </Badge>
              </CardHeader>
              <CardContent>
                <a
                  href={rx.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-2xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  View attached image
                </a>
                {rx.reviewedAt && (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                    Reviewed {formatInstant(rx.reviewedAt)}
                    {rx.reviewerNotes ? ` - "${rx.reviewerNotes}"` : ""}
                  </p>
                )}
                {isReviewer && rx.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => openReview(rx, "APPROVED")}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReview(rx, "REJECTED")}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="mt-5 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Page {listQuery.data.number + 1} of {Math.max(1, listQuery.data.totalPages)} ·{" "}
              {listQuery.data.totalElements} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={listQuery.data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={listQuery.data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload modal ──────────────────────────────────────────────────── */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload prescription"
      >
        <form
          className="space-y-4"
          onSubmit={uploadForm.handleSubmit((v) => uploadMutation.mutate(v))}
          noValidate
        >
          <p className="text-sm text-slate-600">
            Paste a link to the prescription image (PDF or photo). A doctor or pharmacist will review it.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://…"
              {...uploadForm.register("imageUrl")}
            />
            {uploadForm.formState.errors.imageUrl && (
              <p className="text-xs text-red-600">
                {uploadForm.formState.errors.imageUrl.message}
              </p>
            )}
          </div>
          <ErrorMessage error={uploadMutation.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review modal ──────────────────────────────────────────────────── */}
      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title={reviewStatus === "APPROVED" ? "Approve prescription" : "Reject prescription"}
      >
        {reviewing && (
          <form
            className="space-y-4"
            onSubmit={reviewForm.handleSubmit((v) =>
              reviewMutation.mutate({ id: reviewing.id, values: v })
            )}
            noValidate
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">Prescription #{reviewing.id}</p>
              <p className="text-slate-600">Account record</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewerNotes">Notes (optional)</Label>
              <textarea
                id="reviewerNotes"
                className="flex w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                rows={3}
                placeholder="Optional message to the patient…"
                {...reviewForm.register("reviewerNotes")}
              />
              {reviewForm.formState.errors.reviewerNotes && (
                <p className="text-xs text-red-600">
                  {reviewForm.formState.errors.reviewerNotes.message}
                </p>
              )}
            </div>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Status will be set to <strong>{reviewStatus}</strong> via JSON Patch.
            </p>
            <ErrorMessage error={reviewMutation.error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReviewing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
