// SPDX-FileCopyrightText: 2026 ChallengeMyProject
//
// SPDX-License-Identifier: AGPL-3.0-only

import {
  FileExcelOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
  SoundOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type { components } from "@/api/generated/schema";

type FeatureFileType = components["schemas"]["FeatureFileType"];

/**
 * Extensions grouped by the icon that reads them at a glance. Keyed without the
 * leading dot, lower-cased before lookup.
 */
const BY_EXTENSION: Record<string, ReactNode> = {
  // Images
  png: <FileImageOutlined />,
  jpg: <FileImageOutlined />,
  jpeg: <FileImageOutlined />,
  gif: <FileImageOutlined />,
  webp: <FileImageOutlined />,
  svg: <FileImageOutlined />,
  avif: <FileImageOutlined />,
  bmp: <FileImageOutlined />,
  // Video
  mp4: <VideoCameraOutlined />,
  mov: <VideoCameraOutlined />,
  webm: <VideoCameraOutlined />,
  avi: <VideoCameraOutlined />,
  mkv: <VideoCameraOutlined />,
  // Audio
  mp3: <SoundOutlined />,
  wav: <SoundOutlined />,
  ogg: <SoundOutlined />,
  m4a: <SoundOutlined />,
  // Documents
  pdf: <FilePdfOutlined />,
  doc: <FileWordOutlined />,
  docx: <FileWordOutlined />,
  xls: <FileExcelOutlined />,
  xlsx: <FileExcelOutlined />,
  csv: <FileExcelOutlined />,
  ppt: <FilePptOutlined />,
  pptx: <FilePptOutlined />,
  md: <FileMarkdownOutlined />,
  txt: <FileTextOutlined />,
  // Archives
  zip: <FileZipOutlined />,
  rar: <FileZipOutlined />,
  "7z": <FileZipOutlined />,
  tar: <FileZipOutlined />,
  gz: <FileZipOutlined />,
};

/** Strips a leading dot so `.pdf` and `pdf` look up the same icon. */
const LEADING_DOT = /^\./;

/** Fallback when the extension is unknown: lean on the declared file type. */
const BY_TYPE: Record<FeatureFileType, ReactNode> = {
  screenshot: <FileImageOutlined />,
  video: <VideoCameraOutlined />,
  document: <FileTextOutlined />,
  other: <FileOutlined />,
};

/**
 * The icon that best represents a file, picked from its extension first (a
 * `.pdf` looks like a PDF whatever its declared type) and its type otherwise.
 */
export function fileIcon(
  fileExtension: string,
  type: FeatureFileType
): ReactNode {
  const key = fileExtension.replace(LEADING_DOT, "").toLowerCase();
  return BY_EXTENSION[key] ?? BY_TYPE[type];
}
