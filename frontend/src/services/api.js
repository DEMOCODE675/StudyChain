import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
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
