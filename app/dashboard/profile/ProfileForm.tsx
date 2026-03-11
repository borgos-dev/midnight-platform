// app/dashboard/profile/ProfileForm.tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "./actions";

type ProfileFormProps = {
  creatorId: number;
  defaultValues: {
    displayName: string;
    bio: string;
    location: string;
    whatsappNumber: string;
    avatarUrl: string | null;
  };
};

export default function ProfileForm({ creatorId, defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    defaultValues.avatarUrl
  );

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be under 5MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        await updateProfile(formData);
        router.push(`/creator/${creatorId}`);
      } catch (err: any) {
        setError(err?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 shrink-0 rounded-full bg-white/5 overflow-hidden border border-white/[0.06]">
          {preview ? (
            <img
              src={preview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white/20">
              {defaultValues.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div>
          <label className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition inline-block">
            Change photo
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
          <p className="text-[10px] text-white/25 mt-1.5">
            JPG, PNG. Max 5MB.
          </p>
        </div>
      </div>

      {/* Display Name */}
      <FieldGroup label="Display Name">
        <input
          name="displayName"
          defaultValue={defaultValues.displayName}
          required
          minLength={2}
          maxLength={50}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition"
          placeholder="Your display name"
        />
      </FieldGroup>

      {/* Bio */}
      <FieldGroup label="Bio">
        <textarea
          name="bio"
          defaultValue={defaultValues.bio}
          rows={3}
          maxLength={300}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition resize-none"
          placeholder="A short description about yourself..."
        />
      </FieldGroup>

      {/* Location */}
      <FieldGroup label="Location / City">
        <input
          name="location"
          defaultValue={defaultValues.location}
          maxLength={100}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition"
          placeholder="e.g. Douala, Cameroon"
        />
      </FieldGroup>

      {/* WhatsApp */}
      <FieldGroup label="WhatsApp Number">
        <input
          name="whatsappNumber"
          defaultValue={defaultValues.whatsappNumber}
          maxLength={20}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition"
          placeholder="e.g. 237670000000"
        />
        <p className="text-[10px] text-white/25 mt-1">
          Include country code, no spaces or dashes.
        </p>
      </FieldGroup>

      {/* Feedback */}
      {error && (
        <p className="text-[12px] text-red-400 font-medium">{error}</p>
      )}
      {saved && (
        <p className="text-[12px] text-green-400 font-medium">
          Profile saved successfully.
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-purple-600 px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition"
      >
        {pending ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-white/40 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
