import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json?.error) message = json.error;
          else message = text;
        } catch {
          message = text;
        }
      }
    } catch {}
    throw new Error(`${res.status}: ${message}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query keys that may contain query params or objects
    let url: string;
    
    // Filter out non-string parts for base URL
    const stringParts: string[] = [];
    let paramObj: Record<string, any> | null = null;
    
    for (const part of queryKey) {
      if (typeof part === 'string') {
        stringParts.push(part);
      } else if (typeof part === 'object' && part !== null && !Array.isArray(part)) {
        paramObj = part;
      }
    }
    
    const baseUrl = stringParts.join("/");
    
    // Add query params if object exists
    if (paramObj) {
      const params = new URLSearchParams();
      Object.entries(paramObj).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } else if (typeof queryKey[0] === 'string' && queryKey[0].includes('?')) {
      // Already has query params in string
      url = queryKey[0];
    } else {
      url = baseUrl;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
