// Generate blurred version of any Cloudinary URL
export function getBlurredUrl(url: string): string {
  return url.replace(
    "/upload/",
    "/upload/e_blur:800,o_60/"
  );
}

// Generate thumbnail for videos
export function getVideoThumbnail(url: string): string {
  return url
    .replace("/upload/", "/upload/so_0/")
    .replace(".mp4", ".jpg")
    .replace(".mov", ".jpg");
}

// Generate optimized avatar URL
export function getAvatarUrl(url: string, size = 200): string {
  return url.replace(
    "/upload/",
    `/upload/w_${size},h_${size},c_fill,g_face,q_auto,f_auto/`
  );
}