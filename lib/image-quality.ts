import { CutType } from "@/lib/job-types";

export type QualityRating = "excellent" | "good" | "risky" | "poor";

export type ScoreFactor = {
  label: string;
  points: number;
  tone: "positive" | "negative";
};

export type ImageQualityInspection = {
  rating: QualityRating;
  headline: string;
  summary: string;
  dimensions: {
    width: number;
    height: number;
  };
  contentBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    coveragePercentage: number;
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
  warningBadges: string[];
  scoreFactors: ScoreFactor[];
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBandScore(value: number, low: number, high: number) {
  if (high <= low) {
    return value >= high ? 1 : 0;
  }

  return clamp((value - low) / (high - low), 0, 1);
}

function getQualityCopy({
  score,
  contentWidth,
  contentHeight,
  textDensity,
  gradientEffectScore,
  pixelationScore,
  blurScore,
  hasShadowOrPhotoBackground,
  noiseScore,
  tinyDisconnectedRegions,
}: {
  score: number;
  contentWidth: number;
  contentHeight: number;
  textDensity: number;
  gradientEffectScore: number;
  pixelationScore: number;
  blurScore: number;
  hasShadowOrPhotoBackground: boolean;
  noiseScore: number;
  tinyDisconnectedRegions: number;
}) {
  const shortestContentSide = Math.min(contentWidth, contentHeight);
  const hasSmallTextRisk = textDensity > 0.16 || tinyDisconnectedRegions > 50;
  const contentIsSmall = contentWidth < 250 || contentHeight < 120;
  const contentIsExtremelyTiny =
    contentWidth < 110 || contentHeight < 55 || shortestContentSide < 55;
  const unreadableTextRisk =
    hasSmallTextRisk &&
    (contentWidth < 180 ||
      contentHeight < 90 ||
      blurScore < 55 ||
      pixelationScore > 0.22);
  const obviouslyPoor =
    score < 60 ||
    contentIsExtremelyTiny ||
    unreadableTextRisk ||
    blurScore < 25 ||
    pixelationScore > 0.32 ||
    (hasShadowOrPhotoBackground && score < 70) ||
    noiseScore > 0.16 ||
    tinyDisconnectedRegions > 120;
  const hasDetailRisk =
    score < 80 ||
    contentIsSmall ||
    hasSmallTextRisk ||
    gradientEffectScore > 0.45 ||
    pixelationScore > 0.18;

  if (obviouslyPoor) {
    return {
      rating: "poor" as const,
      headline: "Better source recommended",
      summary:
        "This image may not produce a clean SVG. A larger or clearer logo is recommended.",
    };
  }

  if (hasDetailRisk) {
    return {
      rating: "good" as const,
      headline: "May need a better source",
      summary:
        "The main shapes should convert well, but tiny details may simplify.",
    };
  }

  return {
    rating: "excellent" as const,
    headline: "Ready for Cricut",
    summary: "This logo looks suitable for a Cricut-ready SVG.",
  };
}

function getSuccessLabel(score: number) {
  if (score >= 90) {
    return {
      cricutSuccessLabel: "Excellent for Cricut",
      cricutSuccessExplanation: "The SVG should cut cleanly.",
    };
  }

  if (score >= 80) {
    return {
      cricutSuccessLabel: "Very Good",
      cricutSuccessExplanation: "The main shapes should convert very well.",
    };
  }

  if (score >= 70) {
    return {
      cricutSuccessLabel: "Good, fine details may simplify",
      cricutSuccessExplanation:
        "Small details may simplify, but the main logo should work.",
    };
  }

  if (score >= 60) {
    return {
      cricutSuccessLabel: "Usable, review small details",
      cricutSuccessExplanation:
        "A higher-resolution version may improve tiny details.",
    };
  }

  return {
    cricutSuccessLabel: "Better source recommended",
    cricutSuccessExplanation:
      "The main logo may work, but a cleaner source would help.",
  };
}

function getWarningBadges({
  textDensity,
  gradientEffectScore,
  jpegArtifactScore,
  hasShadowOrPhotoBackground,
  backgroundComplexityScore,
  semiTransparentRatio,
  contrastScore,
  tinyDisconnectedRegions,
  noiseScore,
  pixelationScore,
}: {
  textDensity: number;
  gradientEffectScore: number;
  jpegArtifactScore: number;
  hasShadowOrPhotoBackground: boolean;
  backgroundComplexityScore: number;
  semiTransparentRatio: number;
  contrastScore: number;
  tinyDisconnectedRegions: number;
  noiseScore: number;
  pixelationScore: number;
}) {
  const badges: string[] = [];

  if (textDensity > 0.18) {
    badges.push("Small text may simplify");
  }

  if (gradientEffectScore > 0.34) {
    badges.push("Gradients may flatten");
  }

  if (jpegArtifactScore > 0.5) {
    badges.push("JPG texture detected");
  }

  if (hasShadowOrPhotoBackground && backgroundComplexityScore > 0.68) {
    badges.push("Photo-style background");
  } else if (backgroundComplexityScore > 0.54) {
    badges.push("Background detected");
  }

  if (semiTransparentRatio > 0.015) {
    badges.push("Soft transparent edges");
  }

  if (contrastScore < 0.42) {
    badges.push("Some low-contrast areas");
  }

  if (tinyDisconnectedRegions > 35) {
    badges.push("Small separate details");
  }

  if (noiseScore > 0.12 || pixelationScore > 0.22) {
    badges.push("Edges may need smoothing");
  }

  return badges;
}

function getConversionWarnings({
  width,
  height,
  blurScore,
  pixelationScore,
  jpegArtifactScore,
  hasShadowOrPhotoBackground,
  tinyDisconnectedRegions,
  textDensity,
  dominantColors,
  noiseScore,
  gradientEffectScore,
  contrastScore,
  semiTransparentRatio,
}: {
  width: number;
  height: number;
  blurScore: number;
  pixelationScore: number;
  jpegArtifactScore: number;
  hasShadowOrPhotoBackground: boolean;
  tinyDisconnectedRegions: number;
  textDensity: number;
  dominantColors: number;
  noiseScore: number;
  gradientEffectScore: number;
  contrastScore: number;
  semiTransparentRatio: number;
}) {
  const warnings: string[] = [];

  if (width < 120 || height < 120) {
    warnings.push(
      "The SVG can still work, though a larger source may preserve tiny details.",
    );
  }

  if (blurScore < 25) {
    warnings.push("Soft edges may convert into smoother cut lines.");
  } else if (blurScore < 70) {
    warnings.push("Slightly soft edges should still convert, with minor simplification.");
  }

  if (pixelationScore > 0.22) {
    warnings.push("Blocky edges may look a little stepped after conversion.");
  } else if (pixelationScore > 0.12) {
    warnings.push("Some edges may smooth out during SVG conversion.");
  }

  if (jpegArtifactScore > 0.75) {
    warnings.push("JPG texture may add a few extra vector details.");
  } else if (jpegArtifactScore > 0.35) {
    warnings.push("Some JPG texture may be simplified in the SVG.");
  }

  if (noiseScore > 0.12) {
    warnings.push("Speckled areas may be simplified into cleaner shapes.");
  }

  if (tinyDisconnectedRegions > 80) {
    warnings.push("Many small details may become separate cut shapes.");
  } else if (tinyDisconnectedRegions > 30) {
    warnings.push("Small separate details may need a quick review before cutting.");
  }

  if (textDensity > 0.22) {
    warnings.push("Very small text may simplify.");
  } else if (textDensity > 0.14) {
    warnings.push("Fine text may simplify.");
  }

  if (hasShadowOrPhotoBackground) {
    warnings.push("Background or shadow areas may become flat vector shapes.");
  }

  if (gradientEffectScore > 0.34) {
    warnings.push("Gradients may convert into simpler color areas.");
  }

  if (semiTransparentRatio > 0.015) {
    warnings.push("Soft transparent edges may become solid shapes.");
  }

  if (contrastScore < 0.42) {
    warnings.push("Some low-contrast areas may merge together.");
  }

  if (dominantColors > 20) {
    warnings.push("Many color areas may create more Cricut layers.");
  } else if (dominantColors > 10) {
    warnings.push("Several color areas may convert into multiple layers.");
  }

  return warnings;
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

function getNoiseScore(gray: Float32Array, width: number, height: number) {
  let noisyPixels = 0;
  let sampledPixels = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const centerIndex = y * width + x;
      const center = gray[centerIndex];
      const neighbors = [
        gray[centerIndex - width - 1],
        gray[centerIndex - width],
        gray[centerIndex - width + 1],
        gray[centerIndex - 1],
        gray[centerIndex + 1],
        gray[centerIndex + width - 1],
        gray[centerIndex + width],
        gray[centerIndex + width + 1],
      ];
      const neighborAverage =
        neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length;
      const neighborSpread =
        Math.max(...neighbors) - Math.min(...neighbors);

      sampledPixels += 1;

      if (Math.abs(center - neighborAverage) > 22 && neighborSpread < 48) {
        noisyPixels += 1;
      }
    }
  }

  if (!sampledPixels) {
    return 0;
  }

  return Number((noisyPixels / sampledPixels).toFixed(3));
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
  shapeRecognizabilityScore,
}: {
  dominantColors: number;
  colorVarietyCount: number;
  hasTransparency: boolean;
  backgroundComplexityScore: number;
  shapeRecognizabilityScore: number;
}) {
  if (
    dominantColors <= 3 ||
    (dominantColors <= 4 && colorVarietyCount <= 18) ||
    (hasTransparency && dominantColors <= 5 && colorVarietyCount <= 24)
  ) {
    return {
      recommendedCutType: "single" as const,
      recommendationReason:
        shapeRecognizabilityScore > 0.72
          ? "Single-color is recommended because the artwork consists of bold connected shapes."
          : "Single-color is recommended because the artwork behaves like a simple silhouette or black and white design.",
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
      "Multi-color is recommended because the logo contains distinct color regions that should remain separate.",
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
    return `This artwork is ${width} x ${height} pixels. The SVG can still work, but fine details may simplify. A larger official logo from the company's website, Wikipedia, or a brand press kit can improve the final cut paths.`;
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

function getMaskRegionStats(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  let tinyRegions = 0;
  let meaningfulRegions = 0;
  let largestRegionArea = 0;
  let foregroundPixels = 0;
  let foregroundMinX = width;
  let foregroundMinY = height;
  let foregroundMaxX = -1;
  let foregroundMaxY = -1;
  let contentMinX = width;
  let contentMinY = height;
  let contentMaxX = -1;
  let contentMaxY = -1;
  const meaningfulThreshold = Math.max(18, Math.round(width * height * 0.0025));

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }

    const queue = [start];
    visited[start] = 1;
    let area = 0;
    let regionMinX = width;
    let regionMinY = height;
    let regionMaxX = -1;
    let regionMaxY = -1;

    while (queue.length) {
      const current = queue.pop()!;
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      regionMinX = Math.min(regionMinX, x);
      regionMinY = Math.min(regionMinY, y);
      regionMaxX = Math.max(regionMaxX, x);
      regionMaxY = Math.max(regionMaxY, y);

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

    foregroundPixels += area;
    largestRegionArea = Math.max(largestRegionArea, area);
    foregroundMinX = Math.min(foregroundMinX, regionMinX);
    foregroundMinY = Math.min(foregroundMinY, regionMinY);
    foregroundMaxX = Math.max(foregroundMaxX, regionMaxX);
    foregroundMaxY = Math.max(foregroundMaxY, regionMaxY);

    if (area > 0 && area <= 10) {
      tinyRegions += 1;
    }

    if (area >= meaningfulThreshold) {
      meaningfulRegions += 1;
      contentMinX = Math.min(contentMinX, regionMinX);
      contentMinY = Math.min(contentMinY, regionMinY);
      contentMaxX = Math.max(contentMaxX, regionMaxX);
      contentMaxY = Math.max(contentMaxY, regionMaxY);
    }
  }

  const hasMeaningfulContent = contentMaxX >= contentMinX && contentMaxY >= contentMinY;
  const hasForegroundContent =
    foregroundMaxX >= foregroundMinX && foregroundMaxY >= foregroundMinY;
  const bounds = hasMeaningfulContent
    ? {
        x: contentMinX,
        y: contentMinY,
        width: contentMaxX - contentMinX + 1,
        height: contentMaxY - contentMinY + 1,
      }
    : hasForegroundContent
      ? {
          x: foregroundMinX,
          y: foregroundMinY,
          width: foregroundMaxX - foregroundMinX + 1,
          height: foregroundMaxY - foregroundMinY + 1,
        }
      : {
          x: 0,
          y: 0,
          width,
          height,
        };

  return {
    tinyDisconnectedRegions: tinyRegions,
    meaningfulRegions,
    largestRegionRatio: foregroundPixels
      ? Number((largestRegionArea / foregroundPixels).toFixed(3))
      : 0,
    foregroundCoverage: Number((foregroundPixels / mask.length).toFixed(3)),
    bounds,
  };
}

function scaleContentBounds({
  bounds,
  analysisWidth,
  analysisHeight,
  originalWidth,
  originalHeight,
}: {
  bounds: { x: number; y: number; width: number; height: number };
  analysisWidth: number;
  analysisHeight: number;
  originalWidth: number;
  originalHeight: number;
}) {
  const scaleX = originalWidth / analysisWidth;
  const scaleY = originalHeight / analysisHeight;
  const x = Math.round(bounds.x * scaleX);
  const y = Math.round(bounds.y * scaleY);
  const scaledWidth = Math.min(
    originalWidth - x,
    Math.max(1, Math.round(bounds.width * scaleX)),
  );
  const scaledHeight = Math.min(
    originalHeight - y,
    Math.max(1, Math.round(bounds.height * scaleY)),
  );
  const coveragePercentage = Number(
    (((scaledWidth * scaledHeight) / (originalWidth * originalHeight)) * 100).toFixed(1),
  );

  return {
    x,
    y,
    width: scaledWidth,
    height: scaledHeight,
    coveragePercentage,
  };
}

function getForegroundContrastScore({
  data,
  mask,
  background,
}: {
  data: Uint8ClampedArray;
  mask: Uint8Array;
  background: Pixel;
}) {
  let foregroundPixels = 0;
  let grayDifference = 0;
  let colorDifference = 0;

  for (let pixelIndex = 0; pixelIndex < mask.length; pixelIndex += 1) {
    if (!mask[pixelIndex]) {
      continue;
    }

    const pixel = getPixel(data, pixelIndex * 4);
    foregroundPixels += 1;
    grayDifference += Math.abs(getGray(pixel) - getGray(background));
    colorDifference += colorDistance(pixel, background);
  }

  if (!foregroundPixels) {
    return 0;
  }

  const averageGrayDifference = grayDifference / foregroundPixels;
  const averageColorDifference = colorDifference / foregroundPixels;
  const grayScore = getBandScore(averageGrayDifference, 28, 120);
  const colorScore = getBandScore(averageColorDifference, 44, 170);

  return Number(Math.max(grayScore, colorScore * 0.92).toFixed(2));
}

function getDimensionConfidence(width: number, height: number) {
  const shortestSide = Math.min(width, height);

  if (shortestSide < 90) {
    return 0.2;
  }

  if (shortestSide < 150) {
    return 0.45;
  }

  if (shortestSide < 250) {
    return 0.72;
  }

  if (shortestSide < 400) {
    return 0.88;
  }

  return 1;
}

function getShapeRecognizabilityScore({
  meaningfulRegions,
  largestRegionRatio,
  foregroundCoverage,
  tinyDisconnectedRegions,
}: {
  meaningfulRegions: number;
  largestRegionRatio: number;
  foregroundCoverage: number;
  tinyDisconnectedRegions: number;
}) {
  const hasUsableForeground = foregroundCoverage >= 0.015 && foregroundCoverage <= 0.92;
  const regionScore =
    meaningfulRegions === 0
      ? 0
      : meaningfulRegions <= 8
        ? 1
        : meaningfulRegions <= 18
          ? 0.78
          : 0.52;
  const cohesionScore = largestRegionRatio >= 0.72 ? 1 : getBandScore(largestRegionRatio, 0.18, 0.72);
  const tinyPiecePenalty = clamp(tinyDisconnectedRegions / 90, 0, 0.5);

  if (!hasUsableForeground) {
    return 0.25;
  }

  return Number(
    clamp(regionScore * 0.5 + cohesionScore * 0.5 - tinyPiecePenalty, 0, 1).toFixed(2),
  );
}

function getGradientEffectScore({
  colorVarietyCount,
  dominantColors,
  backgroundComplexityScore,
  hasTransparency,
}: {
  colorVarietyCount: number;
  dominantColors: number;
  backgroundComplexityScore: number;
  hasTransparency: boolean;
}) {
  const colorSpread = getBandScore(colorVarietyCount, 32, 130);
  const dominantSpread = getBandScore(dominantColors, 7, 22);
  const backgroundAllowance = hasTransparency ? 0.15 : backgroundComplexityScore * 0.35;

  return Number(
    clamp(colorSpread * 0.62 + dominantSpread * 0.38 - backgroundAllowance, 0, 1).toFixed(2),
  );
}

function getSvgConversionScore({
  width,
  height,
  blurScore,
  edgeDensity,
  pixelationScore,
  jpegArtifactScore,
  backgroundComplexityScore,
  hasShadowOrPhotoBackground,
  tinyDisconnectedRegions,
  textDensity,
  dominantColors,
  contrastScore,
  shapeRecognizabilityScore,
  noiseScore,
  gradientEffectScore,
  hasTransparency,
  semiTransparentRatio,
}: {
  width: number;
  height: number;
  blurScore: number;
  edgeDensity: number;
  pixelationScore: number;
  jpegArtifactScore: number;
  backgroundComplexityScore: number;
  hasShadowOrPhotoBackground: boolean;
  tinyDisconnectedRegions: number;
  textDensity: number;
  dominantColors: number;
  contrastScore: number;
  shapeRecognizabilityScore: number;
  noiseScore: number;
  gradientEffectScore: number;
  hasTransparency: boolean;
  semiTransparentRatio: number;
}) {
  const dimensionConfidence = getDimensionConfidence(width, height);
  const shortestSide = Math.min(width, height);
  const edgeSharpnessScore = Math.min(
    getBandScore(blurScore, 28, 210),
    1 - clamp(pixelationScore / 0.34, 0, 1) * 0.45,
    1 - clamp(noiseScore / 0.2, 0, 1) * 0.35,
    1 - clamp(jpegArtifactScore / 1, 0, 1) * 0.3,
  );
  const hasTextLikeDetail = textDensity > 0.14 || tinyDisconnectedRegions > 36;
  const simpleLogo =
    dominantColors <= 8 &&
    gradientEffectScore < 0.5 &&
    !hasShadowOrPhotoBackground;
  const cleanEdges =
    blurScore >= 70 &&
    edgeSharpnessScore >= 0.42 &&
    pixelationScore <= 0.18 &&
    jpegArtifactScore <= 0.5 &&
    noiseScore <= 0.13;
  const crispEdges =
    blurScore >= 120 &&
    pixelationScore <= 0.1 &&
    jpegArtifactScore <= 0.28 &&
    noiseScore <= 0.08;
  const simpleBackground =
    hasTransparency ||
    backgroundComplexityScore < 0.58 ||
    (!hasShadowOrPhotoBackground && backgroundComplexityScore < 0.68);
  const extremelyBlurry = blurScore < 22;
  const unreadableText =
    hasTextLikeDetail &&
    (textDensity > 0.25 || tinyDisconnectedRegions > 90) &&
    (blurScore < 65 || pixelationScore > 0.18 || shortestSide < 250);
  const heavyPixelation = pixelationScore > 0.3;
  const extremePixelation = pixelationScore > 0.4;
  const photographic =
    hasShadowOrPhotoBackground &&
    backgroundComplexityScore > 0.75 &&
    dominantColors > 16;
  const noisyFragments =
    tinyDisconnectedRegions > 110 &&
    (noiseScore > 0.1 || jpegArtifactScore > 0.5 || pixelationScore > 0.2);
  const smallTextSource = shortestSide < 150 && hasTextLikeDetail;
  const obviousFailureCount = [
    smallTextSource,
    extremelyBlurry,
    unreadableText,
    extremePixelation,
    photographic,
    noisyFragments,
  ].filter(Boolean).length;
  const hasModerateRisk =
    pixelationScore > 0.18 ||
    blurScore < 65 ||
    jpegArtifactScore > 0.5 ||
    noiseScore > 0.12 ||
    textDensity > 0.18 ||
    gradientEffectScore > 0.62 ||
    (hasShadowOrPhotoBackground && backgroundComplexityScore > 0.68);

  let score = 86;

  if (simpleLogo && cleanEdges) {
    score += 5;
  }

  if (simpleLogo && crispEdges) {
    score += 4;
  }

  if (!simpleLogo && cleanEdges && dominantColors <= 24 && contrastScore >= 0.35) {
    score += 2;
  }

  if (dominantColors <= 3 && cleanEdges) {
    score += 3;
  }

  if (simpleBackground) {
    score += 3;
  }

  if (hasTransparency) {
    score += 2;
  }

  if (contrastScore >= 0.58) {
    score += 3;
  } else if (contrastScore < 0.3) {
    score -= 6;
  }

  if (shapeRecognizabilityScore >= 0.42 || edgeDensity >= 0.018) {
    score += 2;
  }

  if (blurScore < 45) {
    score -= 12;
  } else if (blurScore < 70) {
    score -= 5;
  }

  if (heavyPixelation) {
    score -= 18;
  } else if (pixelationScore > 0.22) {
    score -= 10;
  } else if (pixelationScore > 0.14) {
    score -= 5;
  }

  if (jpegArtifactScore > 0.75) {
    score -= 10;
  } else if (jpegArtifactScore > 0.35) {
    score -= 4;
  }

  if (noiseScore > 0.16) {
    score -= 8;
  } else if (noiseScore > 0.1) {
    score -= 4;
  }

  if (textDensity > 0.22) {
    score -= 8;
  } else if (textDensity > 0.14) {
    score -= 4;
  }

  if (tinyDisconnectedRegions > 90) {
    score -= 8;
  } else if (tinyDisconnectedRegions > 45) {
    score -= 4;
  }

  if (photographic) {
    score -= 22;
  } else if (hasShadowOrPhotoBackground && backgroundComplexityScore > 0.68) {
    score -= 8;
  } else if (backgroundComplexityScore > 0.54) {
    score -= 3;
  }

  if (gradientEffectScore > 0.62) {
    score -= 5;
  } else if (gradientEffectScore > 0.38) {
    score -= 2;
  }

  if (dominantColors > 26) {
    score -= 5;
  } else if (dominantColors > 18) {
    score -= 2;
  }

  if (semiTransparentRatio > 0.05) {
    score -= 3;
  } else if (semiTransparentRatio > 0.015) {
    score -= 1;
  }

  if (dimensionConfidence < 0.45) {
    score -= hasTextLikeDetail ? 6 : 2;
  } else if (dimensionConfidence < 0.72 && hasTextLikeDetail) {
    score -= 2;
  } else if (dimensionConfidence >= 0.88) {
    score += 1;
  }

  const caps = [
    extremelyBlurry ? 55 : blurScore < 45 ? 70 : 100,
    extremePixelation ? 58 : heavyPixelation ? 78 : 100,
    jpegArtifactScore > 0.85 ? 68 : 100,
    photographic ? 56 : 100,
    noisyFragments ? 58 : 100,
    unreadableText ? 58 : 100,
    smallTextSource ? 58 : 100,
  ];

  score = Math.min(score, ...caps);

  if (!obviousFailureCount && !hasModerateRisk) {
    score = Math.max(score, 80);
  } else if (!obviousFailureCount) {
    score = Math.max(score, 65);
  }

  const cricutSuccessScore = clamp(Math.round(score), 5, 98);

  const factors: ScoreFactor[] = [
    {
      label: "Logo-friendly source",
      points: obviousFailureCount ? 4 : 14,
      tone: "positive",
    },
    {
      label: "Clean edges",
      points: crispEdges ? 10 : cleanEdges ? 7 : blurScore >= 55 ? 3 : -6,
      tone: "positive",
    },
    {
      label: "Main shapes",
      points: shapeRecognizabilityScore >= 0.42 || edgeDensity >= 0.018 ? 6 : 2,
      tone: "positive",
    },
    {
      label: "Color separation",
      points: dominantColors <= 8 ? 6 : dominantColors <= 24 ? 3 : -3,
      tone: "positive",
    },
    {
      label: hasTransparency ? "Transparent background" : "Background",
      points: simpleBackground ? 5 : -3,
      tone: "positive",
    },
    {
      label: "Resolution modifier",
      points:
        dimensionConfidence < 0.45
          ? hasTextLikeDetail
            ? -6
            : -2
          : dimensionConfidence < 0.72 && hasTextLikeDetail
            ? -2
            : dimensionConfidence >= 0.88
              ? 1
              : 0,
      tone: "positive",
    },
    {
      label: "Contrast",
      points: contrastScore >= 0.58 ? 5 : contrastScore < 0.3 ? -5 : 2,
      tone: "positive",
    },
    {
      label: "Connected details",
      points:
        tinyDisconnectedRegions <= 45 ? 4 : tinyDisconnectedRegions <= 90 ? -3 : -6,
      tone: "positive",
    },
  ];

  const penalties = ([
    {
      label: "Small text may simplify",
      points: textDensity > 0.22 ? -8 : textDensity > 0.14 ? -4 : 0,
      tone: "negative",
    },
    {
      label: "Gradients may flatten",
      points: gradientEffectScore > 0.62 ? -5 : gradientEffectScore > 0.38 ? -2 : 0,
      tone: "negative",
    },
    {
      label: "Soft edges",
      points: blurScore < 45 ? -12 : blurScore < 70 ? -5 : 0,
      tone: "negative",
    },
    {
      label: "JPG texture",
      points: jpegArtifactScore > 0.75 ? -10 : jpegArtifactScore > 0.35 ? -4 : 0,
      tone: "negative",
    },
    {
      label: "Speckled areas",
      points: noiseScore > 0.16 ? -8 : noiseScore > 0.1 ? -4 : 0,
      tone: "negative",
    },
    {
      label: "Blocky edges",
      points: heavyPixelation ? -18 : pixelationScore > 0.22 ? -10 : pixelationScore > 0.14 ? -5 : 0,
      tone: "negative",
    },
    {
      label: "Background detected",
      points:
        photographic
          ? -22
          : hasShadowOrPhotoBackground && backgroundComplexityScore > 0.68
            ? -8
            : backgroundComplexityScore > 0.54
              ? -3
              : 0,
      tone: "negative",
    },
    {
      label: "Soft transparent edges",
      points: semiTransparentRatio > 0.05 ? -3 : semiTransparentRatio > 0.015 ? -1 : 0,
      tone: "negative",
    },
    {
      label: "Obvious source risk",
      points: obviousFailureCount ? -12 * obviousFailureCount : 0,
      tone: "negative",
    },
  ] satisfies ScoreFactor[]).filter((factor) => factor.points !== 0);

  const scoreFactors = [...factors, ...penalties]
    .filter((factor) => Math.abs(factor.points) >= 2)
    .map((factor) => ({
      ...factor,
      tone: factor.points >= 0 ? ("positive" as const) : ("negative" as const),
    }))
    .sort((first, second) => Math.abs(second.points) - Math.abs(first.points));

  const label = getSuccessLabel(cricutSuccessScore);

  return {
    cricutSuccessScore,
    cricutSuccessLabel: label.cricutSuccessLabel,
    cricutSuccessExplanation: label.cricutSuccessExplanation,
    scoreFactors,
  };
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
  let semiTransparentPixels = 0;

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const pixel = getPixel(data, dataIndex);
    gray[pixelIndex] = getGray(pixel);

    if (pixel.a < 250) {
      transparentPixels += 1;
    }

    if (pixel.a > 30 && pixel.a < 230) {
      semiTransparentPixels += 1;
    }
  }

  const hasTransparency = transparentPixels > width * height * 0.01;
  const semiTransparentRatio = semiTransparentPixels / (width * height);
  const background = getBackgroundColor(data, width, height);
  const dominantColors = getDominantColorCount(data, width, height);
  const { blurScore, edgeDensity } = getBlurAndEdgeScores(gray, width, height);
  const colorVarietyCount = getColorVarietyCount(data);
  const pixelationScore = getPixelationScore(gray, width, height);
  const noiseScore = getNoiseScore(gray, width, height);
  const jpegArtifactScore =
    file.type === "image/jpeg" ? getJpegArtifactScore(gray, width, height) : 0;
  const backgroundComplexityScore = getBackgroundComplexityScore({
    colorVarietyCount,
    dominantColors,
    edgeDensity,
    hasTransparency,
  });
  const mask = buildForegroundMask({
    data,
    width,
    height,
    background,
    hasTransparency,
  });
  const regionStats = getMaskRegionStats(mask, width, height);
  const contentBounds = scaleContentBounds({
    bounds: regionStats.bounds,
    analysisWidth: width,
    analysisHeight: height,
    originalWidth,
    originalHeight,
  });
  const tinyDisconnectedRegions = regionStats.tinyDisconnectedRegions;
  const contrastScore = getForegroundContrastScore({
    data,
    mask,
    background,
  });
  const shapeRecognizabilityScore = getShapeRecognizabilityScore({
    meaningfulRegions: regionStats.meaningfulRegions,
    largestRegionRatio: regionStats.largestRegionRatio,
    foregroundCoverage: regionStats.foregroundCoverage,
    tinyDisconnectedRegions,
  });
  const textDensity = Number(edgeDensity.toFixed(3));
  const gradientEffectScore = getGradientEffectScore({
    colorVarietyCount,
    dominantColors,
    backgroundComplexityScore,
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
    shapeRecognizabilityScore,
  });
  const cricutSuccess = getSvgConversionScore({
    width: contentBounds.width,
    height: contentBounds.height,
    blurScore,
    edgeDensity,
    pixelationScore,
    jpegArtifactScore,
    backgroundComplexityScore,
    hasShadowOrPhotoBackground,
    tinyDisconnectedRegions,
    textDensity,
    dominantColors,
    contrastScore,
    shapeRecognizabilityScore,
    noiseScore,
    gradientEffectScore,
    hasTransparency,
    semiTransparentRatio,
  });
  const sourceRecommendation = getSourceRecommendation({
    width: contentBounds.width,
    height: contentBounds.height,
    cricutSuccessScore: cricutSuccess.cricutSuccessScore,
    blurScore,
    pixelationScore,
  });
  const warningBadges = getWarningBadges({
    textDensity,
    gradientEffectScore,
    jpegArtifactScore,
    hasShadowOrPhotoBackground,
    backgroundComplexityScore,
    semiTransparentRatio,
    contrastScore,
    tinyDisconnectedRegions,
    noiseScore,
    pixelationScore,
  });
  const warnings = getConversionWarnings({
    width: contentBounds.width,
    height: contentBounds.height,
    blurScore,
    pixelationScore,
    jpegArtifactScore,
    hasShadowOrPhotoBackground,
    tinyDisconnectedRegions,
    textDensity,
    dominantColors,
    noiseScore,
    gradientEffectScore,
    contrastScore,
    semiTransparentRatio,
  });
  const copy = getQualityCopy({
    score: cricutSuccess.cricutSuccessScore,
    contentWidth: contentBounds.width,
    contentHeight: contentBounds.height,
    textDensity,
    gradientEffectScore,
    pixelationScore,
    blurScore,
    hasShadowOrPhotoBackground,
    noiseScore,
    tinyDisconnectedRegions,
  });

  return {
    rating: copy.rating,
    headline: copy.headline,
    summary: copy.summary,
    dimensions: {
      width: originalWidth,
      height: originalHeight,
    },
    contentBounds,
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
    warningBadges,
    scoreFactors: cricutSuccess.scoreFactors,
    recommendedCutType,
    recommendationReason,
    cricutSuccessScore: cricutSuccess.cricutSuccessScore,
    cricutSuccessLabel: cricutSuccess.cricutSuccessLabel,
    cricutSuccessExplanation: cricutSuccess.cricutSuccessExplanation,
    sourceRecommendation,
    warnings,
  };
}
