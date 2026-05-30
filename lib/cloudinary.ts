import { v2 as cloudinary } from "cloudinary";
import {
  buildUploadTransformations,
  type FilterOptions,
} from "./cloudinary-transforms";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Thin wrapper around Cloudinary's upload that always carries the platform
 * watermark and lets callers opt in to face-pixelation. The watermark is
 * an image overlay using the `midnight_watermark` public_id (uploaded
 * once to Cloudinary — see setup notes in cloudinary-transforms.ts).
 * Callers can pass `mediaKind: "VIDEO"` to get the top-right video-style
 * watermark instead of the default bottom-left image style.
 */
export async function uploadToCloudinary(
  dataUri: string,
  opts: { folder?: string } & FilterOptions = {},
) {
  const { folder = "midnight/posts", ...filters } = opts;
  return await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "auto",
    quality: "auto",
    fetch_format: "auto",
    transformation: buildUploadTransformations(filters),
  });
}
