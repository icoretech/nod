export type Theme = "light" | "dark";

/**
 * X has three themes (white, "dim" #15202B and "lights out" #000). The badge only
 * needs to know whether the page background is light or dark.
 */
export function themeOf(backgroundColor: string): Theme {
  const channels = backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r, g, b, alpha = 1] = channels;
  if (r === undefined || g === undefined || b === undefined || alpha === 0) {
    return "light";
  }
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5 ? "dark" : "light";
}
