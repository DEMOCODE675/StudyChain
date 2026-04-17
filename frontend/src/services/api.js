import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

export function readApiError(error, fallback = "Something went wrong.") {
  if (error?.response?.data?.detail) {
    return String(error.response.data.detail);
  }

  if (error?.message) {
    return String(error.message);
  }

  return fallback;
}

export async function fetchStructure() {
  const response = await api.get("/structure");
  return response.data;
}

export async function uploadNote({
  file,
  branch,
  year,
  semester,
  subject,
  chapter,
  tags,
  uploadedBy,
}) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("branch", branch);
  formData.append("year", year);
  formData.append("semester", semester);
  formData.append("subject", subject);
  formData.append("chapter", chapter);
  formData.append("tags", tags.join(","));
  formData.append("uploadedBy", uploadedBy);

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function fetchHealth() {
  const response = await api.get("/health");
  return response.data;
}

export function buildIpfsLink(cid) {
  const gateway =
    import.meta.env.VITE_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  return `${gateway}/${cid}`;
}

function buildNoteFileLink(cid, filename, disposition) {
  const safeCid = String(cid || "").trim();
  if (!safeCid) {
    return "#";
  }

  const params = new URLSearchParams();
  const safeFilename = String(filename || "").trim();
  const normalizedDisposition =
    String(disposition || "attachment").toLowerCase() === "inline"
      ? "inline"
      : "attachment";
  params.set("disposition", normalizedDisposition);

  const query = params.toString();
  const base = String(API_BASE_URL).replace(/\/+$/, "");
  const encodedCid = encodeURIComponent(safeCid);
  const encodedFilename = safeFilename ? encodeURIComponent(safeFilename) : "";
  const path = encodedFilename
    ? `/download/${encodedCid}/${encodedFilename}`
    : `/download/${encodedCid}`;
  return `${base}${path}${query ? `?${query}` : ""}`;
}

export function buildNoteDownloadLink(cid, filename) {
  return buildNoteFileLink(cid, filename, "attachment");
}

export function buildNoteViewLink(cid, filename) {
  return buildNoteFileLink(cid, filename, "inline");
}
