"use client";

import { uploadPost } from "../actions/uploadsPost";
import { useTransition, useState, useRef } from "react";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_GALLERY = 6;

type PostMode = "GALLERY" | "FEED";

export default function UploadPostForm() {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<PostMode>("FEED");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleModeSwitch(m: PostMode) {
    setMode(m);
    setFiles([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    // Validate
    for (const f of selected) {
      if (f.size > MAX_SIZE) {
        alert(`"${f.name}" is too large. Maximum is 50MB.`);
        e.target.value = "";
        return;
      }
    }

    if (mode === "GALLERY") {
      if (selected.length > MAX_GALLERY) {
        alert(`Gallery accepts max ${MAX_GALLERY} images.`);
        e.target.value = "";
        return;
      }
      for (const f of selected) {
        if (!f.type.startsWith("image/")) {
          alert("Gallery accepts images only — no videos.");
          e.target.value = "";
          return;
        }
      }
    }

    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  function handleSubmit(formData: FormData) {
    if (!files.length) {
      alert("Select at least one file");
      return;
    }
    // Append files to formData (multi-file)
    formData.delete("file");
    for (const f of files) {
      formData.append("file", f);
    }
    formData.set("postType", mode);

    startTransition(() => uploadPost(formData));
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a12] overflow-hidden">
      {/* Mode Tabs */}
      <div className="flex border-b border-white/[0.06]">
        <button
          type="button"
          onClick={() => handleModeSwitch("GALLERY")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            mode === "GALLERY"
              ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/[0.04]"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Grid Gallery
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("FEED")}
          className={`flex-1 py-3 text-[13px] font-medium transition ${
            mode === "FEED"
              ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/[0.04]"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Feed Post
        </button>
      </div>

      {/* Mode Description */}
      <div className="px-5 pt-4 pb-2">
        {mode === "GALLERY" ? (
          <p className="text-[11px] text-white/35">
            Upload 1-{MAX_GALLERY} photos for your profile grid gallery. Images
            only.
          </p>
        ) : (
          <p className="text-[11px] text-white/35">
            Share a photo or video to your feed. Supports image and video.
          </p>
        )}
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-4 p-5 pt-2">
        <input
          name="title"
          placeholder="Post title"
          required
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/40"
        />

        <textarea
          name="content"
          placeholder="Caption..."
          rows={2}
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/40 resize-none"
        />

        <div className="flex gap-3">
          <select
            name="accessLevel"
            className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/70 focus:outline-none"
          >
            <option value="REGULAR">Public</option>
            <option value="VIP">VIP only</option>
            <option value="VIP_PLUS">VIP+ only</option>
          </select>

          <label className="flex items-center gap-2 text-[12px] text-white/50 cursor-pointer">
            <input
              type="checkbox"
              name="blurred"
              className="accent-purple-600"
            />
            Blur preview
          </label>
        </div>

        {/* File Input */}
        <div>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept={mode === "GALLERY" ? "image/*" : "image/*,video/*"}
            multiple={mode === "GALLERY"}
            required
            onChange={handleFileChange}
            className="text-[12px] text-white/50 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[12px] file:font-medium file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30 file:cursor-pointer"
          />
        </div>

        {/* Previews */}
        {previews.length > 0 && (
          <div
            className={`grid gap-2 ${
              previews.length === 1
                ? "grid-cols-1"
                : previews.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {previews.map((src, i) => (
              <div
                key={i}
                className="relative h-28 rounded-lg overflow-hidden bg-white/[0.02]"
              >
                {files[i]?.type.startsWith("video") ? (
                  <video
                    src={src}
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <span className="absolute top-1 right-1 bg-black/60 text-[10px] text-white/60 px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={pending || !files.length}
          className="w-full rounded-lg bg-purple-600 py-2.5 text-[13px] font-semibold text-white hover:bg-purple-500 disabled:opacity-40 transition"
        >
          {pending
            ? "Uploading..."
            : mode === "GALLERY"
            ? `Upload ${files.length} Photo${files.length !== 1 ? "s" : ""} to Gallery`
            : "Post to Feed"}
        </button>
      </form>
    </div>
  );
}