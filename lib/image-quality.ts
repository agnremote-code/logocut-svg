import { CutType } from "@/lib/job-types";

export type QualityRating = "excellent" | "good" | "risky" | "poor";

export type ImageQualityInspection = {
  rating: QualityRating;
  headline: string;
  summary: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSizeBytes: number;
  hasTransparency: boolean;
  blurScore: number;
  pixelationScore: number;
  jpegArtifactScore: number;
  backgroundComplexityScore: number;
  hasShadowOrPhotoBackground: boolean;
  tinyDisconnectedRegions: number;
  textDensity: number;
  dominantColors: number;
  recommendedCutType: CutType;
  recommendationReason: string;
  cricutSuccessScore: number;
  cricutSuccessLabel: string;
  cricutSuccessExplanation: string;
  sourceRecommendation?: string;
  warnings: string[];
};

type Pixel = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const MAX_ANALYSIS_SIDE = 180;

function getQualityCopy(rating: QualityRating) {
  if (rating === "excellent") {
    return {
      headline: "Excellent",
      summary: "Likely to produce an excellent Cricut SVG.",
    };
  }

  if (rating === "good") {
    return {
      headline: "Good",
      summary: "Should produce a good Cricut SVG.",
    };
  }

  if (rating === "risky") {
    return {
      headline: "Risky",
      summary: "The SVG may lose small details.",
    };
  }

  return {
    headline: "Poor",
    summary: "Recommend uploading a better logo before continuing.",
  };
}

function colorDistance(first: Pixel, second: Pixel) {
  return Math.sqrt(
    (first.r - second.r) ** 2 +
      (first.g - second.g) ** 2 +
      (first.b - second.b) ** 2,
  );
}

function getGray(pixel: Pixel) {
  return pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114;
}

function getPixel(data: Uint8ClampedArray, index: number): Pixel {
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

function averagePixels(pixels: Pixel[]) {
  const total = pixels.reduce(
    (sum, pixel) => ({
      r: sum.r + pixel.r,
      g: sum.g + pixel.g,
      b: sum.b + pixel.b,
      a: sum.a + pixel.a,
    }),
    { r: 0, g: 0, b: 0, a: 0 },
  );

  return {
    r: total.r / pixels.length,
    g: total.g / pixels.length,
    b: total.b / pixels.length,
    a: total.a / pixels.length,
  };
}

function getBackgroundColor(data: Uint8ClampedArray, width: number, height: number) {
  const cornerIndexes = [
    0,
    (width - 1) * 4,
    ((height - 1) * width) * 4,
    ((height - 1) * width + width - 1) * 4,
  ];

  return averagePixels(cornerIndexes.map((index) => getPixel(data, index)));
}

function getDominantColorCount(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const colors = new Map<string, number>();
  let opaquePixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];

    if (alpha < 30) {
      continue;
    }

    opaquePixels += 1;
    const key = [
      Math.round(data[index] / 32),
      Math.round(data[index + 1] / 32),
      Math.round(data[index + 2] / 32),
    ].join("-");

    colors.set(key, (colors.get(key) ?? 0) + 1);
  }

  if (!opaquePixels) {
    return 0;
  }

  const minimumDominantPixels = Math.max(12, width * height * 0.015);

  return Array.from(colors.values()).filter(
    (count) => count >= minimumDominantPixels,
  ).length;
}

function getColorVarietyCount(data: Uint8ClampedArray) {
  const colors = new Set<string>();

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 30) {
      continue;
    }

    colors.add(
      [
        Math.round(data[index] / 24),
        Math.round(data[index + 1] / 24),
        Math.round(data[index + 2] / 24),
      ].join("-"),
    );
  }

  return colors.size;
}

function getBlurAndEdgeScores(gray: Float32Array, width: number, height: number) {
  const values: number[] = [];
  let edgePixels = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const centerIndex = y * width + x;
      const laplacian =
        gray[centerIndex - width] +
        gray[centerIndex + width] +
        gray[centerIndex - 1] +
        gray[centerIndex + 1] -
        4 * gray[centerIndex];

      const magnitude = Math.abs(laplacian);
      values.push(laplacian);

      if (magnitude > 28) {
        edgePixels += 1;
      }
    }
  }

  if (!values.length) {
    return { blurScore: 0, edgeDensity: 0 };
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  return {
    blurScore: Math.round(variance),
    edgeDensity: edgePixels / values.length,
  };
}

function getJpegArtifactScore(gray: Float32Array, width: number, height: number) {
  let boundaryDiff = 0;
  let boundaryCount = 0;
  let normalDiff = 0;
  let normalCount = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 1; x < width; x += 1) {
      const diff = Math.abs(gray[y * width + x] - gray[y * width + x - 1]);

      if (x % 8 === 0) {
        boundaryDiff += diff;
        boundaryCount += 1;
      } else {
        normalDiff += diff;
        normalCount += 1;
      }
    }
  }

  for (let y = 1; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const diff = Math.abs(gray[y * width + x] - gray[(y - 1) * width + x]);

      if (y % 8 === 0) {
        boundaryDiff += diff;
        boundaryCount += 1;
      } else {
        normalDiff += diff;
        normalCount += 1;
      }
    }
  }

  if (!boundaryCount || !normalCount) {
    return 0;
  }

  const boundaryAverage = boundaryDiff / boundaryCount;
  const normalAverage = normalDiff / normalCount;

  if (normalAverage < 1) {
    return 0;
  }

  return Number(Math.max(0, boundaryAverage / normalAverage - 1).toFixed(2));
}

function getPixelationScore(gray: Float32Array, width: number, height: number) {
  let blockyEdges = 0;
  let blockCount = 0;

  for (let y = 0; y < height - 2; y += 2) {
    for (let x = 0; x < width - 2; x += 2) {
      const topLeft = gray[y * width + x];
      const topRight = gray[y * width + x + 1];
      const bottomLeft = gray[(y + 1) * width + x];
      const bottomRight = gray[(y + 1) * width + x + 1];
      const internalDifference =
        (Math.abs(topLeft - topRight) +
          Math.abs(topLeft - bottomLeft) +
          Math.abs(bottomRight - topRight) +
          Math.abs(bottomRight - bottomLeft)) /
        4;
      const rightDifference = Math.abs(topRight - gray[y * width + x + 2]);
      const bottomDifference = Math.abs(bottomLeft - gray[(y + 2) * width + x]);

      blockCount += 1;

      if (
        internalDifference < 4 &&
        (rightDifference > 22 || bottomDifference > 22)
      ) {
        blockyEdges += 1;
      }
    }
  }

  if (!blockCount) {
    return 0;
  }

  return Number((blockyEdges / blockCount).toFixed(3));
}

function getBackgroundComplexityScore({
  colorVarietyCount,
  dominantColors,
  edgeDensity,
  hasTransparency,
}: {
  colorVarietyCount: number;
  dominantColors: number;
  edgeDensity: number;
  hasTransparency: boolean;
}) {
  if (hasTransparency) {
    return 0;
  }

  const varietyScore = Math.min(1, colorVarietyCount / 120);
  const colorScore = Math.min(1, dominantColors / 24);
  const textureScore = Math.min(1, edgeDensity / 0.22);

  return Number(
    (varietyScore * 0.45 + colorScore * 0.35 + textureScore * 0.2).toFixed(2),
  );
}

function getCutModeRecommendation({
  dominantColors,
  colorVarietyCount,
  hasTransparency,
  backgroundComplexityScore,
}: {
  dominantColors: number;
  colorVarietyCount: number;
  hasTransparency: boolean;
  backgroundComplexityScore: number;
}) {
  if (
    dominantColors <= 3 ||
    (dominantColors <= 4 && colorVarietyCount <= 18) ||
    (hasTransparency && dominantColors <= 5 && colorVarietyCount <= 24)
  ) {
    return {
      recommendedCutType: "single" as const,
      recommendationReason:
        "This looks like simple artwork, a silhouette, or black and white art.",
    };
  }

  if (backgroundComplexityScore > 0.58) {
    return {
      recommendedCutType: "single" as const,
      recommendationReason:
        "The background looks complex, so a single-color cut is the safer starting point.",
    };
  }

  return {
    recommendedCutType: "multi" as const,
    recommendationReason:
      "This logo has several distinct color areas that are likely better as separate layers.",
  };
}

function getRecommendationWarning({
  recommendedCutType,
  recommendationReason,
}: {
  recommendedCutType: CutType;
  recommendationReason: string;
}) {
  return `Recommended: ${
    recommendedCutType === "single"
      ? "Single-color cut"
      : "Multi-color layered cut"
  }. ${recommendationReason}`;
}

function getCricutSuccessScore({
  width,
  height,
  fileSizeBytes,
  blurScore,
  pixelationScore,
  jpegArtifactScore,
  backgroundComplexityScore,
  hasShadowOrPhotoBackground,
  tinyDisconnectedRegions,
  textDensity,
  dominantColors,
}: {
  width: number;
  height: number;
  fileSizeBytes: number;
  blurScore: number;
  pixelationScore: number;
  jpegArtifactScore: number;
  backgroundComplexityScore: number;
  hasShadowOrPhotoBackground: boolean;
  tinyDisconnectedRegions: number;
  textDensity: number;
  dominantColors: number;
}) {
  let score = 100;

  if (width < 150 || height < 150) {
    score -= 28;
  } else if (width < 400 || height < 400) {
    score -= 18;
  } else if (width < 800 || height < 800) {
    score -= 7;
  }

  if (fileSizeBytes < 25_000) {
    score -= 6;
  }

  if (blurScore < 25) {
    score -= 22;
  } else if (blurScore < 70) {
    score -= 10;
  }

  if (pixelationScore > 0.22) {
    score -= 18;
  } else if (pixelationScore > 0.12) {
    score -= 9;
  }

  if (jpegArtifactScore > 0.75) {
    score -= 16;
  } else if (jpegArtifactScore > 0.35) {
    score -= 8;
  }

  if (tinyDisconnectedRegions > 80) {
    score -= 14;
  } else if (tinyDisconnectedRegions > 30) {
    score -= 7;
  }

  if (textDensity > 0.22) {
    score -= 16;
  } else if (textDensity > 0.14) {
    score -= 8;
  }

  if (hasShadowOrPhotoBackground) {
    score -= backgroundComplexityScore > 0.75 ? 16 : 9;
  }

  if (dominantColors > 20) {
    score -= 12;
  } else if (dominantColors > 10) {
    score -= 6;
  }

  const cricutSuccessScore = Math.max(5, Math.min(99, Math.round(score)));

  if (cricutSuccessScore >= 95) {
    return {
      cricutSuccessScore,
      cricutSuccessLabel: "Excellent for Cricut",
      cricutSuccessExplanation:
        "Clean edges and simple artwork should convert into strong cut paths.",
    };
  }

  if (cricutSuccessScore >= 88) {
    return {
      cricutSuccessScore,
      cricutSuccessLabel: "Very good",
      cricutSuccessExplanation:
        "This should cut well, with only minor detail risk.",
    };
  }

  if (cricutSuccessScore >= 70) {
    return {
      cricutSuccessScore,
      cricutSuccessLabel: "May lose fine details",
      cricutSuccessExplanation:
        "Some small details may soften or disappear in the SVG.",
    };
  }

  return {
    cricutSuccessScore,
    cricutSuccessLabel: "Low-quality source image",
    cricutSuccessExplanation:
      "A larger, cleaner logo is recommended before making a Cricut file.",
  };
}

function getSourceRecommendation({
  width,
  height,
  cricutSuccessScore,
  blurScore,
  pixelationScore,
}: {
  width: number;
  height: number;
  cricutSuccessScore: number;
  blurScore: number;
  pixelationScore: number;
}) {
  if (
    width < 150 ||
    height < 150 ||
    cricutSuccessScore < 55 ||
    blurScore < 25 ||
    pixelationScore > 0.22
  ) {
    return `This logo is only ${width} x ${height} pixels. Small or rough logos often lose text and fine details. If possible, upload a larger version from the company's website, Wikipedia, or a brand press kit.`;
  }

  return undefined;
}

function buildForegroundMask({
  data,
  width,
  height,
  background,
  hasTransparency,
}: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  background: Pixel;
  hasTransparency: boolean;
}) {
  const mask = new Uint8Array(width * height);

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const pixel = getPixel(data, dataIndex);

    if (hasTransparency) {
      mask[pixelIndex] = pixel.a > 30 ? 1 : 0;
      continue;
    }

    mask[pixelIndex] = colorDistance(pixel, background) > 38 ? 1 : 0;
  }

  return mask;
}

function getTinyDisconnectedRegionCount(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  let tinyRegions = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    const queue = [start];
    visited[start] = 1;
    let area = 0;

    while (queue.length) {
      const current = queue.pop()!;
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];

      neighbors.forEach((neighbor) => {
        if (neighbor >= 0 && mask[neighbor] && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue.push(neighbor);
        }
      });
    }

    if (area > 0 && area <= 10) {
      tinyRegions += 1;
    }
  }

  return tinyRegions;
}

function getRating({
  width,
  height,
  fileSizeBytes,
  blurScore,
  pixelationScore,
  jpegArtifactScore,
  backgroundComplexityScore,
  hasShadowOrPhotoBackground,
  tinyDisconnectedRegions,
  textDensity,
  dominantColors,
}: {
  width: number;
  height: number;
  fileSizeBytes: number;
  blurScore: number;
  pixelationScore: number;
  jpegArtifactScore: number;
  backgroundComplexityScore: number;
  hasShadowOrPhotoBackground: boolean;
  tinyDisconnectedRegions: number;
  textDensity: number;
  dominantColors: number;
}) {
  let riskPoints = 0;
  const warnings: string[] = [];

  if (width < 150 || height < 150) {
    riskPoints += 3;
    warnings.push(
      "This logo is extremely small. A larger original will cut much more cleanly.",
    );
  } else if (width < 400 || height < 400) {
    riskPoints += 2;
    warnings.push(
      "This logo is on the small side. Fine edges may look rough after tracing.",
    );
  } else if (width < 800 || height < 800) {
    riskPoints += 1;
    warnings.push("A larger logo file would preserve small details better.");
  }

  if (fileSizeBytes < 25_000) {
    riskPoints += 1;
    warnings.push("This file is very small, so it may not contain enough detail.");
  }

  if (blurScore < 25) {
    riskPoints += 2;
    warnings.push("The logo looks blurry. A sharper upload is recommended.");
  } else if (blurScore < 70) {
    riskPoints += 1;
    warnings.push("The logo looks a little soft. Small details may be less crisp.");
  }

  if (pixelationScore > 0.22) {
    riskPoints += 2;
    warnings.push(
      "The logo looks heavily pixelated. Try to find a larger or smoother version.",
    );
  } else if (pixelationScore > 0.12) {
    riskPoints += 1;
    warnings.push("Some edges look blocky and may trace as stair-steps.");
  }

  if (jpegArtifactScore > 0.75) {
    riskPoints += 2;
    warnings.push(
      "The image has heavy JPG noise. A PNG or cleaner original is recommended.",
    );
  } else if (jpegArtifactScore > 0.35) {
    riskPoints += 1;
    warnings.push("Some JPG noise is visible and may add extra cut paths.");
  }

  if (tinyDisconnectedRegions > 80) {
    riskPoints += 2;
    warnings.push(
      "There are many tiny loose details that may become small separate cut pieces.",
    );
  } else if (tinyDisconnectedRegions > 30) {
    riskPoints += 1;
    warnings.push("Some tiny loose details may be hard to weed or cut cleanly.");
  }

  if (textDensity > 0.22) {
    riskPoints += 2;
    warnings.push(
      "This appears to include very small text or thin lines that may be unreadable after cutting.",
    );
  } else if (textDensity > 0.14) {
    riskPoints += 1;
    warnings.push("Small text or thin lines may lose detail in the SVG.");
  }

  if (hasShadowOrPhotoBackground) {
    riskPoints += backgroundComplexityScore > 0.75 ? 2 : 1;
    warnings.push(
      "The image appears to include shadows, texture, or a photo-like background. A flat logo on a plain background will work better.",
    );
  }

  if (dominantColors > 20) {
    riskPoints += 2;
    warnings.push(
      "This image has more than 20 main colors. A simpler logo will produce cleaner Cricut layers.",
    );
  } else if (dominantColors > 10) {
    riskPoints += 1;
    warnings.push("This logo has many colors, so layered output may be complex.");
  }

  if (riskPoints >= 6) {
    return { rating: "poor" as const, warnings };
  }

  if (riskPoints >= 4) {
    return { rating: "risky" as const, warnings };
  }

  if (riskPoints >= 2) {
    return { rating: "good" as const, warnings };
  }

  return { rating: "excellent" as const, warnings };
}

export async function inspectImageQuality(
  file: File,
): Promise<ImageQualityInspection> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const scale = Math.min(
    1,
    MAX_ANALYSIS_SIDE / Math.max(originalWidth, originalHeight),
  );
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Could not inspect image quality in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { data } = context.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  let transparentPixels = 0;

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const pixel = getPixel(data, dataIndex);
    gray[pixelIndex] = getGray(pixel);

    if (pixel.a < 250) {
      transparentPixels += 1;
    }
  }

  const hasTransparency = transparentPixels > width * height * 0.01;
  const background = getBackgroundColor(data, width, height);
  const dominantColors = getDominantColorCount(data, width, height);
  const { blurScore, edgeDensity } = getBlurAndEdgeScores(gray, width, height);
  const colorVarietyCount = getColorVarietyCount(data);
  const pixelationScore = getPixelationScore(gray, width, height);
  const jpegArtifactScore =
    file.type === "image/jpeg" ? getJpegArtifactScore(gray, width, height) : 0;
  const backgroundComplexityScore = getBackgroundComplexityScore({
    colorVarietyCount,
    dominantColors,
    edgeDensity,
    hasTransparency,
  });
  const hasShadowOrPhotoBackground =
    backgroundComplexityScore > 0.58 ||
    (!hasTransparency && dominantColors > 16 && colorVarietyCount > 80);
  const { recommendedCutType, recommendationReason } = getCutModeRecommendation({
    dominantColors,
    colorVarietyCount,
    hasTransparency,
    backgroundComplexityScore,
  });
  const mask = buildForegroundMask({
    data,
    width,
    height,
    background,
    hasTransparency,
  });
  const tinyDisconnectedRegions = getTinyDisconnectedRegionCount(
    mask,
    width,
    height,
  );
  const textDensity = Number(edgeDensity.toFixed(3));
  const cricutSuccess = getCricutSuccessScore({
    width: originalWidth,
    height: originalHeight,
    fileSizeBytes: file.size,
    blurScore,
    pixelationScore,
    jpegArtifactScore,
    backgroundComplexityScore,
    hasShadowOrPhotoBackground,
    tinyDisconnectedRegions,
    textDensity,
    dominantColors,
  });
  const sourceRecommendation = getSourceRecommendation({
    width: originalWidth,
    height: originalHeight,
    cricutSuccessScore: cricutSuccess.cricutSuccessScore,
    blurScore,
    pixelationScore,
  });
  const { rating, warnings } = getRating({
    width: originalWidth,
    height: originalHeight,
    fileSizeBytes: file.size,
    blurScore,
    pixelationScore,
    jpegArtifactScore,
    backgroundComplexityScore,
    hasShadowOrPhotoBackground,
    tinyDisconnectedRegions,
    textDensity,
    dominantColors,
  });
  const recommendations = [
    getRecommendationWarning({
      recommendedCutType,
      recommendationReason,
    }),
    ...warnings,
  ];
  const copy = getQualityCopy(rating);

  return {
    rating,
    headline: copy.headline,
    summary: copy.summary,
    dimensions: {
      width: originalWidth,
      height: originalHeight,
    },
    fileSizeBytes: file.size,
    hasTransparency,
    blurScore,
    pixelationScore,
    jpegArtifactScore,
    backgroundComplexityScore,
    hasShadowOrPhotoBackground,
    tinyDisconnectedRegions,
    textDensity,
    dominantColors,
    recommendedCutType,
    recommendationReason,
    cricutSuccessScore: cricutSuccess.cricutSuccessScore,
    cricutSuccessLabel: cricutSuccess.cricutSuccessLabel,
    cricutSuccessExplanation: cricutSuccess.cricutSuccessExplanation,
    sourceRecommendation,
    warnings: recommendations,
  };
}
