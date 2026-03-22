"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select, SelectOption } from "@/components/ui/Select";

export type FeatureFlagFormValue = {
  environmentId: string;
  key: string;
  name: string;
  description: string;
  rolloutPercent: number;
  enabled: "enabled" | "disabled";
  allowListEmails: string[];
};

type EnvironmentOption = {
  id: string;
  key: string;
  name: string;
};

type FeatureFlagFormFieldsProps = {
  value: FeatureFlagFormValue;
  environments: EnvironmentOption[];
  onChange: (next: FeatureFlagFormValue) => void;
  disabled?: boolean;
  prefix: "create" | "edit";
};

export function FeatureFlagFormFields({
  value,
  environments,
  onChange,
  disabled = false,
  prefix,
}: FeatureFlagFormFieldsProps) {
  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  function addAllowEmail() {
    const normalized = emailDraft.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!isValid) {
      setEmailError("Invalid email format.");
      return;
    }
    if (value.allowListEmails.includes(normalized)) {
      setEmailError("Email already added.");
      return;
    }

    onChange({
      ...value,
      allowListEmails: [...value.allowListEmails, normalized],
    });
    setEmailDraft("");
    setEmailError(null);
  }

  function removeAllowEmail(email: string) {
    onChange({
      ...value,
      allowListEmails: value.allowListEmails.filter((item) => item !== email),
    });
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <FormField label="Environment" htmlFor={`${prefix}-feature-flag-environment`} className="mt-0">
        <Select
          id={`${prefix}-feature-flag-environment`}
          value={value.environmentId}
          onChange={(event) => onChange({ ...value, environmentId: event.target.value })}
          disabled={disabled}
          searchable
          searchPlaceholder="Search environments..."
          options={[
            { value: "", label: "Select environment" },
            ...environments.map((environment) => ({
              value: environment.id,
              label: `${environment.name} (${environment.key})`,
            })),
          ]}
        >
          <SelectOption value="">Select environment</SelectOption>
        </Select>
      </FormField>

      <FormField label="Key" htmlFor={`${prefix}-feature-flag-key`} className="mt-0">
        <input
          id={`${prefix}-feature-flag-key`}
          type="text"
          value={value.key}
          onChange={(event) => onChange({ ...value, key: event.target.value })}
          disabled={disabled}
          placeholder="key (ex: checkout_v2)"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
        />
      </FormField>

      <FormField label="Name" htmlFor={`${prefix}-feature-flag-name`} className="mt-0">
        <input
          id={`${prefix}-feature-flag-name`}
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          disabled={disabled}
          placeholder="Name"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
        />
      </FormField>

      <FormField label="Description" htmlFor={`${prefix}-feature-flag-description`} className="mt-0">
        <input
          id={`${prefix}-feature-flag-description`}
          type="text"
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          disabled={disabled}
          placeholder="Description"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
        />
      </FormField>

      <FormField label="Rollout (%)" htmlFor={`${prefix}-feature-flag-rollout`} className="mt-0">
        <input
          id={`${prefix}-feature-flag-rollout`}
          type="number"
          min={0}
          max={100}
          value={value.rolloutPercent}
          onChange={(event) =>
            onChange({ ...value, rolloutPercent: Number(event.target.value) })
          }
          disabled={disabled}
          placeholder="0-100"
          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
        />
      </FormField>

      <FormField label="Status" htmlFor={`${prefix}-feature-flag-enabled`} className="mt-0">
        <Select
          id={`${prefix}-feature-flag-enabled`}
          value={value.enabled}
          onChange={(event) =>
            onChange({
              ...value,
              enabled: event.target.value === "enabled" ? "enabled" : "disabled",
            })
          }
          disabled={disabled}
        >
          <SelectOption value="enabled">Enabled</SelectOption>
          <SelectOption value="disabled">Disabled</SelectOption>
        </Select>
      </FormField>

      <div className="md:col-span-2">
        <FormField label="Allow List Emails" htmlFor={`${prefix}-feature-flag-allow-list`} className="mt-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`${prefix}-feature-flag-allow-list`}
              type="email"
              value={emailDraft}
              onChange={(event) => {
                setEmailDraft(event.target.value);
                if (emailError) {
                  setEmailError(null);
                }
              }}
              disabled={disabled}
              placeholder="user@example.com"
              className="h-10 min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[#465fff]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || emailDraft.trim().length === 0}
              onClick={addAllowEmail}
              leftIcon={(
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            >
              Add Email
            </Button>
          </div>
          {emailError ? (
            <Alert variant="error" className="mt-2">
              {emailError}
            </Alert>
          ) : null}
          {value.allowListEmails.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {value.allowListEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeAllowEmail(email)}
                    className="text-slate-500 hover:text-slate-800"
                    aria-label={`Remove ${email}`}
                    disabled={disabled}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No emails in allow list.</p>
          )}
        </FormField>
      </div>
    </div>
  );
}
