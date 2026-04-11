import ImageKit from "imagekit";

let imagekitInstance: ImageKit | null = null;

export const getIK = () => {
  if (!imagekitInstance) {
    imagekitInstance = new ImageKit({
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
    });
  }
  return imagekitInstance;
};

export const getIKAuthenticationParameters = () => {
  return getIK().getAuthenticationParameters();
};

/**
 * AI Transformations for ImageKit
 * Documentation: https://docs.imagekit.io/features/image-transformations/ai-powered-transformations
 */
export const getAITransformedUrl = (url: string, transformation: "bg-remove" | "smart-crop" | "auto-enhance") => {
  const ikUrl = new URL(url);
  let tr = "";

  switch (transformation) {
    case "bg-remove":
      tr = "tr:e-bg_remove";
      break;
    case "smart-crop":
      tr = "tr:w-1080,h-1080,cm-extract,fo-auto"; // AI-aware smart crop to 1:1
      break;
    case "auto-enhance":
      tr = "tr:e-enhance";
      break;
  }

  // Inject transformation into the path
  const pathParts = ikUrl.pathname.split("/");
  pathParts.splice(pathParts.length - 1, 0, tr);
  ikUrl.pathname = pathParts.join("/");

  return ikUrl.toString();
};
