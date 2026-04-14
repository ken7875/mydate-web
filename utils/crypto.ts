export async function computeSHA256(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return computeSHA256(buffer);
}
