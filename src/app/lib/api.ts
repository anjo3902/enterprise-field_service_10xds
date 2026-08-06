import { supabase } from "./supabase";
import { toast } from "sonner";

export class ApiError extends Error {
  constructor(public status: number, public message: string, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  isUpload?: boolean;
}

export const api = {
  /**
   * Core fetch wrapper with JWT injection, timeout, retry strategy, and error handling.
   */
  async fetchWithAuth<T>(url: string, options: FetchOptions = {}): Promise<T> {
    const {
      timeoutMs = 15000,
      retries = 2,
      retryDelayMs = 1000,
      isUpload = false,
      ...fetchOptions
    } = options;

    // JWT Injection & Token Refresh check (Supabase handles refresh internally when we call getSession)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn("Session error:", sessionError);
    }

    const headers = new Headers(fetchOptions.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    
    // Don't set Content-Type for FormData uploads (browser sets it with boundary)
    if (!isUpload && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Attempt logic
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
      
      // Allow caller to pass their own signal, but combine with our timeout signal
      const signal = fetchOptions.signal;
      if (signal) {
        signal.addEventListener('abort', () => abortController.abort());
      }

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: abortController.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = await response.text();
          }
          
          const errorMessage = errorData?.message || errorData?.error || `API Error: ${response.statusText}`;
          throw new ApiError(response.status, errorMessage, errorData);
        }
        
        // Empty 204 No Content
        if (response.status === 204) {
          return null as any;
        }

        return await response.json() as T;

      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        // Cancelled / Timeout
        if (err.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeoutMs}ms`);
        }

        // Retry only on network errors or 5xx server errors
        const isRetryable = err instanceof TypeError || (err instanceof ApiError && err.status >= 500);
        
        if (isRetryable && attempt < retries) {
          console.warn(`API Attempt ${attempt + 1} failed, retrying in ${retryDelayMs}ms...`);
          await new Promise(res => setTimeout(res, retryDelayMs));
          continue;
        }
        
        break;
      }
    }

    // Centralized Error Handling for completely failed requests
    if (lastError) {
      if (lastError instanceof ApiError && lastError.status === 401) {
        toast.error("Session expired. Please log in again.");
        supabase.auth.signOut();
        window.location.href = "/login";
      } else {
        toast.error(lastError.message || "A network error occurred.");
      }
      throw lastError;
    }
    
    throw new Error("Unknown API error");
  },

  /**
   * Typed wrapper for invoking Supabase Edge Functions with retry and standard error handling.
   */
  async callEdgeFunction<T>(functionName: string, payload: any, options: FetchOptions = {}): Promise<T> {
    const { retries = 0, retryDelayMs = 1000 } = options;
    
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke<T>(functionName, {
          body: payload
        });
        
        if (error) {
          throw error;
        }
        return data as T;
      } catch (err: any) {
        lastError = err;
        
        // Very basic retry on 5xx or network issues from Edge Functions
        if (attempt < retries) {
          await new Promise(res => setTimeout(res, retryDelayMs));
          continue;
        }
        break;
      }
    }
    
    toast.error(lastError.message || `Edge function ${functionName} failed.`);
    throw lastError;
  }
};
