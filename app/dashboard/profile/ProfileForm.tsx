// app/dashboard/profile/ProfileForm.tsx
"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { updateProfile } from "./actions";
import { CAMEROON_CITIES } from "@/app/lib/cities";
import { CategoryPicker } from "./CategoryPicker";
import { TagsInput } from "./TagsInput";
import { BlurRegionEditor } from "@/app/components/blur-editor/BlurRegionEditor";

type ProfileFormProps = {
  creatorId: number;
  /** Full set of categories the platform offers, in display order. */
  categories: { slug: string; label: string }[];
  defaultValues: {
    displayName: string;
    bio: string;
    location: string;
    neighborhood: string;
    whatsappNumber: string;
    avatarUrl: string | null;
    /** Slugs of categories already attached to the creator. */
    categorySlugs: string[];
    /** YYYY-MM-DD or null — read-only here. Captured at signup, locked
     *  afterward; only admins can change it. */
    birthDate: string | null;
    /** Free-text tags the creator typed for their public profile. Distinct
     *  from `categorySlugs` (which are platform taxonomy). */
    customTags: string[];
  };
};

export default function ProfileForm({
  creatorId,
  categories,
  defaultValues,
}: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    defaultValues.avatarUrl
  );
  // We track the avatar File in component state so the BlurRegionEditor
  // can replace it with the blurred version. The native <input> stays in
  // the form for browser UX (picker, accessibility) but its files attribute
  // is overridden via FormData manipulation below.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be under 5MB.");
      return;
    }
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);

    // If the user opened the blur editor and saved a modified version, the
    // edited File lives in `avatarFile`. Replace whatever the native input
    // contributed so we send the blurred blob to the server, not the raw
    // one. When avatarFile is null (no new avatar chosen) we leave the
    // input's empty entry alone — the server treats that as "no change".
    if (avatarFile) {
      formData.set("avatar", avatarFile, avatarFile.name);
    }

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
        <div className="h-20 w-20 shrink-0 rounded-full bg-white/5 overflow-hidden border border-white/6">
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
          <label className="cursor-pointer rounded-lg border border-white/10 bg-white/3 px-4 py-2 text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/6 transition inline-block">
            Change photo
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
          <p className="text-eyebrow text-white/25 mt-1.5">
            JPG, PNG. Max 5MB.
          </p>

          {/* Privacy opt-in for the avatar specifically. Same effect as the
              post upload toggle, scoped to the profile picture so creators
              can stay anonymous on their public profile without affecting
              gallery uploads. */}
          <label className="flex items-start gap-2 mt-3 text-[12px] text-white/60 cursor-pointer max-w-xs">
            <input
              type="checkbox"
              name="avatarFaceBlur"
              className="mt-0.5 accent-purple-600"
            />
            <span className="leading-snug">
              Pixelate my face in this avatar (auto)
              <span className="block text-[11px] text-white/35 mt-0.5">
                Hide your identity until you connect via WhatsApp.
              </span>
            </span>
          </label>

          {/* Manual blur — only available once a new avatar file has been
              picked. Without a File we have nothing to draw on. */}
          {avatarFile && (
            <button
              type="button"
              onClick={() => setEditingAvatar(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-purple-600/85 hover:bg-purple-500 px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-white transition"
            >
              <Wand2 size={12} strokeWidth={2.5} />
              ADD CUSTOM BLUR
            </button>
          )}
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
          className="w-full rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition"
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
          className="w-full rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition resize-none"
          placeholder="A short description about yourself..."
        />
      </FieldGroup>

      {/* Categories — multi-select. Renders as toggleable pills; the
          underlying hidden checkboxes submit as multiple `categorySlugs`
          form fields that `formData.getAll()` reads on the server. */}
      <FieldGroup label="Categories">
        <CategoryPicker
          categories={categories}
          defaultSelected={defaultValues.categorySlugs}
        />
      </FieldGroup>

      {/* Custom tags — free-text keywords the creator types. Shows on
          their public profile next to the platform categories but isn't
          used for filtering. Lets creators describe niches the platform
          taxonomy doesn't cover. */}
      <FieldGroup label="Custom tags">
        <TagsInput defaultValue={defaultValues.customTags} />
      </FieldGroup>

      {/* City + Neighborhood — side-by-side on desktop, stacked on mobile.
          City is a fixed dropdown of major Cameroonian cities (single
          source of truth in app/lib/cities.ts) so the homepage location
          filter aggregates cleanly. Neighborhood stays free-text since
          it's too granular and varied to enumerate per city. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup label="City">
          <select
            name="location"
            defaultValue={defaultValues.location}
            required
            className="w-full appearance-none rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-purple-500/50 transition cursor-pointer"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='%23a855f7'><path d='M3 4.5l3 3 3-3'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              backgroundSize: "12px",
              paddingRight: "36px",
            }}
          >
            <option value="" style={{ background: "#1a1a2e" }}>
              Select a city…
            </option>
            {CAMEROON_CITIES.map((city) => (
              <option key={city} value={city} style={{ background: "#1a1a2e" }}>
                {city}
              </option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup label="Neighborhood (optional)">
          <input
            name="neighborhood"
            defaultValue={defaultValues.neighborhood}
            maxLength={80}
            className="w-full rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition"
            placeholder="e.g. Bonapriso, Makepe"
          />
        </FieldGroup>
      </div>

      {/* Birth date — read-only. Captured once at signup; only admins can
          correct typos via Prisma Studio. We render it as a disabled input
          rather than plain text so its visual weight matches the rest of
          the form fields and the "locked" intent is obvious. */}
      <FieldGroup label="Birth Date">
        <div style={{ position: "relative" }}>
          <input
            type="date"
            value={defaultValues.birthDate ?? ""}
            readOnly
            disabled
            aria-readonly="true"
            className="w-full rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-[13px] text-white/50 focus:outline-none transition cursor-not-allowed"
            style={{ colorScheme: "dark" }}
          />
        </div>
        <p className="text-eyebrow text-white/25 mt-1">
          {defaultValues.birthDate
            ? "Locked. Contact support to correct a typo."
            : "Not set — older account. Contact support to add your birth date."}
        </p>
      </FieldGroup>

      {/* WhatsApp */}
      <FieldGroup label="WhatsApp Number">
        <input
          name="whatsappNumber"
          defaultValue={defaultValues.whatsappNumber}
          maxLength={20}
          className="w-full rounded-lg border border-white/8 bg-white/3 px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition"
          placeholder="e.g. 237670000000"
        />
        <p className="text-eyebrow text-white/25 mt-1">
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

      {/* Avatar blur editor — rendered inside the form so the modal stays
          tied to this component's lifecycle. The modal itself uses
          position: fixed so the form's space doesn't matter. */}
      {editingAvatar && avatarFile && (
        <BlurRegionEditor
          file={avatarFile}
          onSave={(modified) => {
            setAvatarFile(modified);
            const old = preview;
            setPreview(URL.createObjectURL(modified));
            if (old && old.startsWith("blob:")) URL.revokeObjectURL(old);
            setEditingAvatar(false);
          }}
          onCancel={() => setEditingAvatar(false)}
        />
      )}
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
      <label className="block text-label font-medium text-white/40 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
