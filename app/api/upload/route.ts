import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import {
  buildUploadTransformations,
  readFaceBlurFlag,
} from "@/lib/cloudinary-transforms";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { isSameOrigin } from "@/app/lib/auth-helpers";
import { uploadLimiter, getIPFromRequest } from "@/app/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // CSRF: reject cross-site browser requests.
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auth check — only logged in creators can upload
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limit per IP so an authenticated account can't be used to hammer
    // Cloudinary with uploads (storage/bandwidth abuse).
    const { success } = await uploadLimiter.limit(getIPFromRequest(req));
    if (!success) {
      return NextResponse.json(
        { error: "Too many uploads. Please slow down and try again shortly." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string ?? "post";
    // Per-upload privacy opt-in. Universal — every tier can request face-blur.
    // Cloudinary's face-pixelate only fires on still images; video uploads
    // here pass through unmodified and rely on the MediaPipe browser pipeline.
    const faceBlur = readFaceBlurFlag(formData.get("faceBlur"));

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images and videos allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    // Images → max 10MB, Videos → max 100MB
    const maxSize = file.type.startsWith("video") 
      ? 100 * 1024 * 1024  // 100MB
      : 10 * 1024 * 1024;  // 10MB

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size is ${file.type.startsWith("video") ? "100MB" : "10MB"}` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // Determine folder based on upload type
    const folder = type === "avatar"
      ? "midnight/avatars"
      : "midnight/posts";

    // Upload to Cloudinary with the platform watermark always applied and
    // face-pixelation only when the caller opted in AND the file is an image.
    // mediaKind drives watermark position (image: bottom-left, video:
    // top-right) per the launch-prep visual brief.
    const isImage = file.type.startsWith("image/");
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "auto", // handles both images and videos
      quality: "auto",       // auto optimize quality
      fetch_format: "auto",  // serve best format per browser
      transformation: buildUploadTransformations({
        mediaKind: isImage ? "IMAGE" : "VIDEO",
        faceBlur: faceBlur && isImage,
      }),
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: file.type.startsWith("video") ? "VIDEO" : "IMAGE",
      width: result.width,
      height: result.height,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}