const API_BASE = "http://localhost:8000/api";

export async function compileFile(file: File, title: string, author: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("author", author);

  const res = await fetch(`${API_BASE}/compile`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Compilation trigger failed");
  return res.json();
}

export async function getCompileStatus(jobId: string) {
  const res = await fetch(`${API_BASE}/compile/status/${jobId}`);
  if (!res.ok) throw new Error("Status query failed");
  return res.json();
}

export async function getLibrary() {
  const res = await fetch(`${API_BASE}/library`);
  if (!res.ok) throw new Error("Failed to load library items");
  return res.json();
}

export async function getPackage(packageId: string) {
  const res = await fetch(`${API_BASE}/package/${packageId}`);
  if (!res.ok) throw new Error("Failed to unpack container contents");
  return res.json();
}

export async function chatWithTutor(packageId: string, sessionId: string, message: string, role: string) {
  const formData = new FormData();
  formData.append("package_id", packageId);
  formData.append("session_id", sessionId);
  formData.append("message", message);
  formData.append("role", role);

  const res = await fetch(`${API_BASE}/tutor/chat`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Tutor chat failed");
  return res.json();
}

export async function getTutorHistory(packageId: string, sessionId: string) {
  const res = await fetch(`${API_BASE}/tutor/history/${packageId}/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch tutor conversation history");
  return res.json();
}

export async function updateProgress(packageId: string, elementId: string, elementType: string, status = "completed", score = 0) {
  const res = await fetch(`${API_BASE}/progress/update?package_id=${packageId}&element_id=${elementId}&element_type=${elementType}&status=${status}&score=${score}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to log learning progress");
  return res.json();
}

export async function runCode(code: string, language = "javascript") {
  const formData = new FormData();
  formData.append("code", code);
  formData.append("language", language);

  const res = await fetch(`${API_BASE}/run-code`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Code execution failed");
  return res.json();
}
