const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  
  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  } else if (!options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...headers,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
