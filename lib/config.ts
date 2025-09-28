// Configuration for the Flask backend API
export const API_CONFIG = {
  // Flask backend URL - update this to match your Flask server
  FLASK_BASE_URL: process.env.FLASK_API_URL || 'http://localhost:5000',

  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    CONVERSATIONS: '/api/conversations',
    CONVERSATION_MESSAGES: '/api/conversations/{conversationId}/messages',
    CONVERSATION_DELETE: '/api/conversations/{conversationId}',
    CAPABILITIES: '/api/capabilities',
    CONFIG_OPENAI: '/api/config/openai',
    CONFIG_GOOGLE: '/api/config/google',
    CONFIG_XERO: '/api/config/xero',
    CONFIG_STATUS: '/api/config/status',
  },
  
  // Request timeout in milliseconds (reduced from 30s to 15s)
  TIMEOUT: 15000,
} as const;

// Helper function to build full URLs
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.FLASK_BASE_URL}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });
  }
  
  return url;
}

// Helper function to make API requests to Flask backend
export async function makeFlaskRequest(
  url: string, 
  options: RequestInit = {},
  userId?: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    // Always include userId in X-User-Id header if provided
    if (userId) {
      headers['X-User-Id'] = userId;
    }
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
