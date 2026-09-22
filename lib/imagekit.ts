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
  const params = getIK().getAuthenticationParameters();
  return {
    ...params,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
  };
};

/**
 * AI Transformations for ImageKit
 * Documentation: https://docs.imagekit.io/features/image-transformations/ai-powered-transformations
 */
export const getAITransformedUrl = (
  url: string,
  transformation: "bg-remove" | "smart-crop" | "auto-enhance",
) => {
  if (!url) return url;
  try {
    const ikUrl = new URL(url);
    let tr = "";

    switch (transformation) {
      case "bg-remove":
        tr = "e-bgremove";
        break;
      case "smart-crop":
        tr = "w-1080,h-1080,fo-auto";
        break;
      case "auto-enhance":
        tr = "e-retouch";
        break;
    }

    // Insert `tr:<transform>` right after host / root endpoint path
    const parts = ikUrl.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("tr:")) {
      parts[0] = `tr:${tr}`;
    } else {
      parts.unshift(`tr:${tr}`);
    }

    ikUrl.pathname = "/" + parts.join("/");
    return ikUrl.toString();
  } catch {
    return url;
  }
};
