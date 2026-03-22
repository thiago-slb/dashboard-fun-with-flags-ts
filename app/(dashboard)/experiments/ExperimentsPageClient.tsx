"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Header } from "@/components/dashboard/Header";
import { SideMenu } from "@/components/dashboard/SideMenu";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormField } from "@/components/ui/FormField";
import { H1 } from "@/components/ui/H1";
import { H2 } from "@/components/ui/H2";
import { Select, SelectOption } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Subtitle } from "@/components/ui/Subtitle";
import { Table, Tbody, Th, Thead, Tr } from "@/components/ui/Table";
import { useEnvironmentsQuery } from "@/hooks/use-environments";
import { useFeatureFlagsQuery } from "@/hooks/use-feature-flags";
import {
  useCreateExperimentMutation,
  useDeleteExperimentMutation,
  useInfiniteExperimentsQuery,
  useUpdateExperimentMutation,
} from "@/hooks/use-experiments";
import type { CreateExperimentInput, ExperimentItem } from "@/lib/experiments/schemas";

type ExperimentsPageClientProps = {
  userName: string;
  userEmail: string;
};

type VariantForm = {
  key: string;
  name: string;
  trafficPercent: number;
  isControl: boolean;
};

type ExperimentForm = Omit<CreateExperimentInput, "variants"> & {
  variants: VariantForm[];
  startAt: string | null;
  endAt: string | null;
};

const defaultVariants: VariantForm[] = [
  { key: "a", name: "Variant A", trafficPercent: 50, isControl: true },
  { key: "b", name: "Variant B", trafficPercent: 50, isControl: false },
];

const defaultForm: ExperimentForm = {
  environmentId: "",
  featureFlagId: null,
  key: "",
  name: "",
  description: null,
  status: "DRAFT",
  allocationMode: "FIXED",
  targetType: "USER",
  targetValue: null,
  segmentCountry: null,
  segmentDevice: "ANY",
  stickyBucketing: true,
  gradualRolloutEnabled: false,
  rolloutPercent: 100,
  autoStart: false,
  autoStop: false,
  startAt: null,
  endAt: null,
  goalEventName: "signup_completed",
  guardrailMaxErrorRate: null,
  guardrailMinRevenue: null,
  variants: defaultVariants,
};

function formatDateInput(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 16);
}

function toPayload(form: ExperimentForm): CreateExperimentInput {
  return {
    environmentId: form.environmentId,
    featureFlagId: form.featureFlagId ?? null,
    key: form.key.trim().toLowerCase(),
    name: form.name.trim(),
    status: form.status,
    allocationMode: form.allocationMode,
    targetType: form.targetType,
    description: form.description?.trim() || null,
    targetValue: form.targetValue?.trim() || null,
    segmentCountry: form.segmentCountry?.trim().toUpperCase() || null,
    segmentDevice: form.segmentDevice,
    stickyBucketing: form.stickyBucketing,
    gradualRolloutEnabled: form.gradualRolloutEnabled,
    rolloutPercent: form.rolloutPercent,
    autoStart: form.autoStart,
    autoStop: form.autoStop,
    goalEventName: form.goalEventName.trim().toLowerCase(),
    guardrailMaxErrorRate: form.guardrailMaxErrorRate ?? null,
    guardrailMinRevenue: form.guardrailMinRevenue ?? null,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
    endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
    variants: form.variants.map((variant, index) => ({
      ...variant,
      key: variant.key.trim().toLowerCase() || `var_${index + 1}`,
      name: variant.name.trim() || `Variant ${index + 1}`,
    })),
  };
}

export function ExperimentsPageClient({ userName, userEmail }: ExperimentsPageClientProps) {
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createForm, setCreateForm] = useState<ExperimentForm>(defaultForm);
  const [editForm, setEditForm] = useState<ExperimentForm>(defaultForm);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const environmentsQuery = useEnvironmentsQuery();
  const featureFlagsQuery = useFeatureFlagsQuery();
  const experimentsQuery = useInfiniteExperimentsQuery(debouncedSearch);
  const createMutation = useCreateExperimentMutation();
  const updateMutation = useUpdateExperimentMutation();
  const deleteMutation = useDeleteExperimentMutation();

  const experiments = useMemo(
    () => experimentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [experimentsQuery.data],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && experimentsQuery.hasNextPage && !experimentsQuery.isFetchingNextPage) {
          void experimentsQuery.fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [experimentsQuery]);

  const summary = useMemo(() => {
    const running = experiments.filter((item) => item.status === "RUNNING").length;
    const bandit = experiments.filter((item) => item.allocationMode === "BANDIT").length;
    return {
      total: experiments.length,
      running,
      bandit,
    };
  }, [experiments]);

  function updateVariant(
    form: ExperimentForm,
    setForm: Dispatch<SetStateAction<ExperimentForm>>,
    index: number,
    patch: Partial<VariantForm>,
  ) {
    setForm({
      ...form,
      variants: form.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    });
  }

  function addVariant(form: ExperimentForm, setForm: Dispatch<SetStateAction<ExperimentForm>>) {
    if (form.variants.length >= 8) {
      return;
    }
    const nextCount = form.variants.length + 1;
    const nextWeight = Math.floor(100 / nextCount);
    const variants = [...form.variants, { key: `v${nextCount}`, name: `Variant ${nextCount}`, trafficPercent: nextWeight, isControl: false }];
    const normalized = variants.map((variant, index) => ({
      ...variant,
      trafficPercent: index === variants.length - 1 ? 100 - nextWeight * (variants.length - 1) : nextWeight,
    }));
    setForm({ ...form, variants: normalized });
  }

  function removeVariant(
    form: ExperimentForm,
    setForm: Dispatch<SetStateAction<ExperimentForm>>,
    index: number,
  ) {
    if (form.variants.length <= 2) {
      return;
    }
    const variants = form.variants.filter((_, variantIndex) => variantIndex !== index);
    const nextWeight = Math.floor(100 / variants.length);
    const normalized = variants.map((variant, variantIndex) => ({
      ...variant,
      trafficPercent: variantIndex === variants.length - 1 ? 100 - nextWeight * (variants.length - 1) : nextWeight,
      isControl: variantIndex === 0 ? true : variant.isControl,
    }));
    setForm({ ...form, variants: normalized });
  }

  async function handleCreate() {
    await createMutation.mutateAsync(toPayload(createForm));
    setCreateModalOpen(false);
    setCreateForm(defaultForm);
  }

  async function handleUpdate() {
    if (!editingId) {
      return;
    }
    await updateMutation.mutateAsync({
      id: editingId,
      data: toPayload(editForm),
    });
    setEditModalOpen(false);
    setEditingId(null);
    setEditForm(defaultForm);
  }

  async function handleDeleteConfirmed() {
    if (!deleteTargetId) {
      return;
    }
    await deleteMutation.mutateAsync(deleteTargetId);
    setDeleteTargetId(null);
    setConfirmDeleteOpen(false);
  }

  function openEdit(item: ExperimentItem) {
    setEditingId(item.id);
    setEditForm({
      environmentId: item.environmentId,
      featureFlagId: item.featureFlagId,
      key: item.key,
      name: item.name,
      description: item.description,
      status: item.status,
      allocationMode: item.allocationMode,
      targetType: item.targetType,
      targetValue: item.targetValue,
      segmentCountry: item.segmentCountry,
      segmentDevice: item.segmentDevice,
      stickyBucketing: item.stickyBucketing,
      gradualRolloutEnabled: item.gradualRolloutEnabled,
      rolloutPercent: item.rolloutPercent,
      autoStart: item.autoStart,
      autoStop: item.autoStop,
      startAt: item.startAt,
      endAt: item.endAt,
      goalEventName: item.goalEventName,
      guardrailMaxErrorRate: item.guardrailMaxErrorRate,
      guardrailMinRevenue: item.guardrailMinRevenue,
      variants: item.variants.map((variant) => ({
        key: variant.key,
        name: variant.name,
        trafficPercent: variant.trafficPercent,
        isControl: variant.isControl,
      })),
    });
    setEditModalOpen(true);
  }

  function renderFormSection({
    form,
    setForm,
    prefix,
  }: {
    form: ExperimentForm;
    setForm: Dispatch<SetStateAction<ExperimentForm>>;
    prefix: string;
  }) {
    return (
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <FormField label={t("experiments.environmentLabel")} htmlFor={`${prefix}-environment`} className="mt-0">
          <Select
            id={`${prefix}-environment`}
            value={form.environmentId}
            onChange={(event) => setForm({ ...form, environmentId: event.target.value })}
            searchable
            options={[
              { value: "", label: t("experiments.environmentPlaceholder") },
              ...((environmentsQuery.data ?? []).map((environment) => ({
                value: environment.id,
                label: `${environment.name} (${environment.key})`,
              }))),
            ]}
          >
            <SelectOption value="">{t("experiments.environmentPlaceholder")}</SelectOption>
          </Select>
        </FormField>

        <FormField label={t("experiments.featureFlagLabel")} htmlFor={`${prefix}-feature-flag`} className="mt-0">
          <Select
            id={`${prefix}-feature-flag`}
            value={form.featureFlagId ?? ""}
            onChange={(event) => setForm({ ...form, featureFlagId: event.target.value || null })}
            searchable
            options={[
              { value: "", label: t("experiments.featureFlagPlaceholder") },
              ...((featureFlagsQuery.data ?? []).map((flag) => ({
                value: flag.id,
                label: `${flag.name} (${flag.key})`,
              }))),
            ]}
          >
            <SelectOption value="">{t("experiments.featureFlagPlaceholder")}</SelectOption>
          </Select>
        </FormField>

        <FormField label={t("experiments.keyLabel")} htmlFor={`${prefix}-key`} className="mt-0">
          <input
            id={`${prefix}-key`}
            value={form.key}
            onChange={(event) => setForm({ ...form, key: event.target.value })}
            placeholder={t("experiments.keyPlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.nameLabel")} htmlFor={`${prefix}-name`} className="mt-0">
          <input
            id={`${prefix}-name`}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={t("experiments.namePlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.modeLabel")} htmlFor={`${prefix}-mode`} className="mt-0">
          <Select
            id={`${prefix}-mode`}
            value={form.allocationMode}
            onChange={(event) =>
              setForm({
                ...form,
                allocationMode: event.target.value === "BANDIT" ? "BANDIT" : "FIXED",
              })
            }
          >
            <SelectOption value="FIXED">{t("experiments.modeFixed")}</SelectOption>
            <SelectOption value="BANDIT">{t("experiments.modeBandit")}</SelectOption>
          </Select>
        </FormField>

        <FormField label={t("experiments.statusLabel")} htmlFor={`${prefix}-status`} className="mt-0">
          <Select
            id={`${prefix}-status`}
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: (event.target.value as ExperimentForm["status"]) ?? "DRAFT",
              })
            }
          >
            <SelectOption value="DRAFT">{t("experiments.statusDraft")}</SelectOption>
            <SelectOption value="RUNNING">{t("experiments.statusRunning")}</SelectOption>
            <SelectOption value="PAUSED">{t("experiments.statusPaused")}</SelectOption>
            <SelectOption value="COMPLETED">{t("experiments.statusCompleted")}</SelectOption>
          </Select>
        </FormField>

        <FormField label={t("experiments.targetTypeLabel")} htmlFor={`${prefix}-target-type`} className="mt-0">
          <Select
            id={`${prefix}-target-type`}
            value={form.targetType}
            onChange={(event) =>
              setForm({
                ...form,
                targetType: (event.target.value as ExperimentForm["targetType"]) ?? "USER",
              })
            }
          >
            <SelectOption value="USER">{t("experiments.targetUser")}</SelectOption>
            <SelectOption value="FEATURE">{t("experiments.targetFeature")}</SelectOption>
            <SelectOption value="PAGE">{t("experiments.targetPage")}</SelectOption>
          </Select>
        </FormField>

        <FormField label={t("experiments.targetValueLabel")} htmlFor={`${prefix}-target-value`} className="mt-0">
          <input
            id={`${prefix}-target-value`}
            value={form.targetValue ?? ""}
            onChange={(event) => setForm({ ...form, targetValue: event.target.value || null })}
            placeholder={t("experiments.targetValuePlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.countryLabel")} htmlFor={`${prefix}-country`} className="mt-0">
          <input
            id={`${prefix}-country`}
            value={form.segmentCountry ?? ""}
            onChange={(event) => setForm({ ...form, segmentCountry: event.target.value || null })}
            placeholder={t("experiments.countryPlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.deviceLabel")} htmlFor={`${prefix}-device`} className="mt-0">
          <Select
            id={`${prefix}-device`}
            value={form.segmentDevice}
            onChange={(event) =>
              setForm({
                ...form,
                segmentDevice: (event.target.value as ExperimentForm["segmentDevice"]) ?? "ANY",
              })
            }
          >
            <SelectOption value="ANY">{t("experiments.deviceAny")}</SelectOption>
            <SelectOption value="MOBILE">{t("experiments.deviceMobile")}</SelectOption>
            <SelectOption value="DESKTOP">{t("experiments.deviceDesktop")}</SelectOption>
            <SelectOption value="TABLET">{t("experiments.deviceTablet")}</SelectOption>
          </Select>
        </FormField>

        <FormField label={t("experiments.goalEventLabel")} htmlFor={`${prefix}-goal-event`} className="mt-0">
          <input
            id={`${prefix}-goal-event`}
            value={form.goalEventName}
            onChange={(event) => setForm({ ...form, goalEventName: event.target.value })}
            placeholder="signup_completed"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.rolloutLabel")} htmlFor={`${prefix}-rollout`} className="mt-0">
          <input
            id={`${prefix}-rollout`}
            type="number"
            min={0}
            max={100}
            value={form.rolloutPercent}
            onChange={(event) => setForm({ ...form, rolloutPercent: Number(event.target.value) || 0 })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.startAtLabel")} htmlFor={`${prefix}-start`} className="mt-0">
          <input
            id={`${prefix}-start`}
            type="datetime-local"
            value={formatDateInput(form.startAt)}
            onChange={(event) => setForm({ ...form, startAt: event.target.value || null })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.endAtLabel")} htmlFor={`${prefix}-end`} className="mt-0">
          <input
            id={`${prefix}-end`}
            type="datetime-local"
            value={formatDateInput(form.endAt)}
            onChange={(event) => setForm({ ...form, endAt: event.target.value || null })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.guardrailErrorLabel")} htmlFor={`${prefix}-guardrail-error`} className="mt-0">
          <input
            id={`${prefix}-guardrail-error`}
            type="number"
            min={0}
            max={1}
            step="0.01"
            value={form.guardrailMaxErrorRate ?? ""}
            onChange={(event) => setForm({ ...form, guardrailMaxErrorRate: event.target.value ? Number(event.target.value) : null })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <FormField label={t("experiments.guardrailRevenueLabel")} htmlFor={`${prefix}-guardrail-revenue`} className="mt-0">
          <input
            id={`${prefix}-guardrail-revenue`}
            type="number"
            min={0}
            step="0.01"
            value={form.guardrailMinRevenue ?? ""}
            onChange={(event) => setForm({ ...form, guardrailMinRevenue: event.target.value ? Number(event.target.value) : null })}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label={t("experiments.descriptionLabel")} htmlFor={`${prefix}-description`} className="mt-0">
            <textarea
              id={`${prefix}-description`}
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value || null })}
              placeholder={t("experiments.descriptionPlaceholder")}
              className="min-h-[84px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#465fff]"
            />
          </FormField>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{t("experiments.variantsTitle")}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addVariant(form, setForm)}
              >
                {t("experiments.addVariant")}
              </Button>
            </div>

            <div className="space-y-2">
              {form.variants.map((variant, index) => (
                <div key={`${prefix}-variant-${index}`} className="grid gap-2 rounded-lg border border-slate-200 p-2 md:grid-cols-[1fr_1fr_120px_120px_auto]">
                  <input
                    value={variant.key}
                    onChange={(event) => updateVariant(form, setForm, index, { key: event.target.value })}
                    placeholder="key"
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    value={variant.name}
                    onChange={(event) => updateVariant(form, setForm, index, { name: event.target.value })}
                    placeholder="name"
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-[#465fff]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={variant.trafficPercent}
                    onChange={(event) => updateVariant(form, setForm, index, { trafficPercent: Number(event.target.value) || 0 })}
                    className="h-9 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-[#465fff]"
                  />
                  <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={variant.isControl}
                      onChange={(event) => updateVariant(form, setForm, index, { isControl: event.target.checked })}
                    />
                    {t("experiments.control")}
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="bg-gray-200 text-black hover:bg-gray-300"
                    onClick={() => removeVariant(form, setForm, index)}
                    disabled={form.variants.length <= 2}
                  >
                    {t("experiments.remove")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.stickyBucketing}
              onChange={(event) => setForm({ ...form, stickyBucketing: event.target.checked })}
            />
            {t("experiments.stickyBucketing")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.gradualRolloutEnabled}
              onChange={(event) => setForm({ ...form, gradualRolloutEnabled: event.target.checked })}
            />
            {t("experiments.gradualRollout")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.autoStart}
              onChange={(event) => setForm({ ...form, autoStart: event.target.checked })}
            />
            {t("experiments.autoStart")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.autoStop}
              onChange={(event) => setForm({ ...form, autoStop: event.target.checked })}
            />
            {t("experiments.autoStop")}
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-[#f8fbff] to-[#f4f6fb]">
      <SideMenu isOpen={sidebarOpen} />

      {sidebarOpen ? (
        <Button
          type="button"
          variant="unstyled"
          size="none"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-gray-900/50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          userName={userName}
          userEmail={userEmail}
        />

        <main className="p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <H1>{t("experiments.title")}</H1>
              <Subtitle>{t("experiments.subtitle")}</Subtitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{t("experiments.total")}: {summary.total}</Badge>
              <Badge variant="success">{t("experiments.running")}: {summary.running}</Badge>
              <Badge variant="info">{t("experiments.bandit")}: {summary.bandit}</Badge>
              <Button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                disabled={(environmentsQuery.data ?? []).length === 0}
                leftIcon={(
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              >
                {t("experiments.createButton")}
              </Button>
            </div>
          </div>

          {(environmentsQuery.data ?? []).length === 0 ? (
            <Alert variant="warning" className="mb-4">
              {t("experiments.needEnvironment")}
            </Alert>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <H2>{t("experiments.listTitle")}</H2>
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("experiments.searchPlaceholder")}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm outline-none focus:border-[#465fff]"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchInput("")}
                    aria-label={t("experiments.clearSearch")}
                    className="absolute right-1 top-1 h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </Button>
                ) : null}
              </div>
            </div>

            {experimentsQuery.isLoading ? (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[900px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("experiments.tableName")}</Th>
                      <Th className="pb-3">{t("experiments.tableMode")}</Th>
                      <Th className="pb-3">{t("experiments.tableStatus")}</Th>
                      <Th className="pb-3">{t("experiments.tableTarget")}</Th>
                      <Th className="pb-3">{t("experiments.tableGoal")}</Th>
                      <Th className="pb-3">{t("experiments.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Tr key={`exp-skeleton-${index}`} className="border-t border-slate-100">
                        <td className="py-3"><Skeleton className="h-4 w-48" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3"><Skeleton className="h-8 w-32 rounded-lg" /></td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            ) : experimentsQuery.error ? (
              <Alert variant="error" className="mt-4">
                {(experimentsQuery.error as Error).message}
              </Alert>
            ) : experiments.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t("experiments.empty")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table className="w-full min-w-[900px] text-left text-sm">
                  <Thead>
                    <Tr className="text-xs uppercase tracking-wide text-slate-500">
                      <Th className="pb-3">{t("experiments.tableName")}</Th>
                      <Th className="pb-3">{t("experiments.tableMode")}</Th>
                      <Th className="pb-3">{t("experiments.tableStatus")}</Th>
                      <Th className="pb-3">{t("experiments.tableTarget")}</Th>
                      <Th className="pb-3">{t("experiments.tableGoal")}</Th>
                      <Th className="pb-3">{t("experiments.tableActions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="text-slate-700">
                    {experiments.map((experiment) => (
                      <Tr key={experiment.id} className="border-t border-slate-100">
                        <td className="py-3">
                          <p className="font-semibold text-slate-900">{experiment.name}</p>
                          <p className="text-xs text-slate-500">{experiment.key}</p>
                        </td>
                        <td className="py-3">
                          <Badge variant={experiment.allocationMode === "BANDIT" ? "info" : "neutral"}>
                            {experiment.allocationMode === "BANDIT" ? t("experiments.modeBandit") : t("experiments.modeFixed")}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              experiment.status === "RUNNING"
                                ? "success"
                                : experiment.status === "PAUSED"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {experiment.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className="text-xs text-slate-600">{experiment.targetType}: {experiment.targetValue ?? "-"}</span>
                        </td>
                        <td className="py-3">{experiment.goalEventName}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => openEdit(experiment)}
                            >
                              {t("experiments.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setDeleteTargetId(experiment.id);
                                setConfirmDeleteOpen(true);
                              }}
                            >
                              {t("experiments.delete")}
                            </Button>
                          </div>
                        </td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
                {experimentsQuery.isFetchingNextPage ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          {createModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("experiments.createModalTitle")}</H2>
                  <Button type="button" variant="secondary" className="bg-gray-200 text-black hover:bg-gray-300" onClick={() => setCreateModalOpen(false)}>
                    {t("experiments.close")}
                  </Button>
                </div>
                {renderFormSection({ form: createForm, setForm: setCreateForm, prefix: "create" })}
                {createMutation.error ? (
                  <Alert variant="error" className="mt-3">{createMutation.error.message}</Alert>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="secondary" className="bg-gray-200 text-black hover:bg-gray-300" onClick={() => setCreateModalOpen(false)}>
                    {t("experiments.cancel")}
                  </Button>
                  <Button type="button" onClick={handleCreate} loading={createMutation.isPending} loadingLabel={t("experiments.creating")}>
                    {t("experiments.create")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {editModalOpen ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <H2 className="text-lg">{t("experiments.editModalTitle")}</H2>
                  <Button type="button" variant="secondary" className="bg-gray-200 text-black hover:bg-gray-300" onClick={() => setEditModalOpen(false)}>
                    {t("experiments.close")}
                  </Button>
                </div>
                {renderFormSection({ form: editForm, setForm: setEditForm, prefix: "edit" })}
                {updateMutation.error ? (
                  <Alert variant="error" className="mt-3">{updateMutation.error.message}</Alert>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="secondary" className="bg-gray-200 text-black hover:bg-gray-300" onClick={() => setEditModalOpen(false)}>
                    {t("experiments.cancel")}
                  </Button>
                  <Button type="button" onClick={handleUpdate} loading={updateMutation.isPending} loadingLabel={t("experiments.saving")}>
                    {t("experiments.save")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <ConfirmDialog
            isOpen={confirmDeleteOpen}
            title={t("experiments.deleteConfirmTitle")}
            description={t("experiments.deleteConfirmDescription")}
            confirmLabel={t("experiments.delete")}
            cancelLabel={t("experiments.cancel")}
            isPending={deleteMutation.isPending}
            onCancel={() => {
              setConfirmDeleteOpen(false);
              setDeleteTargetId(null);
            }}
            onConfirm={() => {
              void handleDeleteConfirmed();
            }}
          />
        </main>
      </div>
    </div>
  );
}
