// Utility functions for link detection and iframe handling

// Regular expression to detect URLs
export const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Regular expression to detect file paths (Unix/Windows paths) - more specific to ensure absolute paths
export const FILE_PATH_REGEX = /(\/[^\/\s]+(?:\/[^\/\s]+)*\.[a-zA-Z0-9]+|[A-Za-z]:\\[^\\:\s]+(?:\\[^\\:\s]+)*\.[a-zA-Z0-9]+)/g;

// Regular expression to detect API endpoints
export const API_ENDPOINT_REGEX = /(\/api\/[^\s]+)/g;

// Combined regex for URLs, file paths, and API endpoints
export const LINK_REGEX = /(https?:\/\/[^\s]+|\/api\/[^\s]+|\/[^\/\s]+(?:\/[^\/\s]+)*\.[a-zA-Z0-9]+|[A-Za-z]:\\[^\\:\s]+(?:\\[^\\:\s]+)*\.[a-zA-Z0-9]+)/g;

// Function to extract URLs from text
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

// Function to extract file paths from text
export function extractFilePaths(text: string): string[] {
  const matches = text.match(FILE_PATH_REGEX);
  return matches || [];
}

// Function to extract API endpoints from text
export function extractApiEndpoints(text: string): string[] {
  const matches = text.match(API_ENDPOINT_REGEX);
  return matches || [];
}

// Function to extract all links (URLs, file paths, and API endpoints) from text
export function extractAllLinks(text: string): string[] {
  const matches = text.match(LINK_REGEX);
  return matches || [];
}

// Function to check if a link is a file path
export function isFilePath(link: string): boolean {
  // Reset regex state before testing
  FILE_PATH_REGEX.lastIndex = 0;
  URL_REGEX.lastIndex = 0;
  API_ENDPOINT_REGEX.lastIndex = 0;
  
  const isFilePattern = FILE_PATH_REGEX.test(link);
  
  // Reset again after first test
  FILE_PATH_REGEX.lastIndex = 0;
  URL_REGEX.lastIndex = 0;
  API_ENDPOINT_REGEX.lastIndex = 0;
  
  const isUrlPattern = URL_REGEX.test(link);
  const isApiPattern = API_ENDPOINT_REGEX.test(link);
  
  return isFilePattern && !isUrlPattern && !isApiPattern;
}

// Function to check if a link is an API endpoint
export function isApiEndpoint(link: string): boolean {
  // Reset regex state
  API_ENDPOINT_REGEX.lastIndex = 0;
  return API_ENDPOINT_REGEX.test(link);
}

// Function to open file path
export function openFilePath(filePath: string) {
  // For file paths, we can try to open them in a new tab with file:// protocol
  // Note: This may not work in all browsers due to security restrictions
  if (typeof window !== 'undefined') {
    // Try to open as file:// URL
    window.open(`file://${filePath}`, '_blank');
  }
}

// Function to check if a URL is embeddable (not blocked by X-Frame-Options)
export function isEmbeddableUrl(url: string): boolean {
  // Check if it's an API endpoint - these should be embeddable
  if (isApiEndpoint(url)) {
    return true;
  }

  // Check if it's a file path - these should be embeddable
  if (isFilePath(url)) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Special cases for embeddable Google services
    if (hostname.includes('docs.google.com') || 
        hostname.includes('sheets.google.com') || 
        hostname.includes('slides.google.com') ||
        hostname.includes('drive.google.com')) {
      return true;
    }
    
    // List of domains that typically don't allow embedding
    const blockedDomains = [
      'facebook.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'linkedin.com',
      'youtube.com', // YouTube has specific embed URLs
      'google.com', // Block general Google but allow specific services above
      'github.com'
    ];
    
    // Check if it's a blocked domain
    const isBlocked = blockedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    return !isBlocked;
  } catch {
    return false;
  }
}

// Function to convert YouTube URLs to embeddable format
export function getEmbeddableUrl(url: string): string {
  // Handle file paths - return just the relative path
  if (isFilePath(url)) {
    // Extract relative path from ai-finance-analyst onwards
    if (url.includes('ai-finance-analyst/')) {
      return url.split('ai-finance-analyst/')[1];
    }
    // If no ai-finance-analyst in path, return the path as is
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    // Handle YouTube URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Handle Google Docs/Sheets/Slides/Drive
    if (urlObj.hostname.includes('docs.google.com') || 
        urlObj.hostname.includes('sheets.google.com') || 
        urlObj.hostname.includes('slides.google.com') ||
        urlObj.hostname.includes('drive.google.com')) {
      
      // Convert edit URLs to preview format
      if (url.includes('/edit')) {
        return url.replace('/edit', '/preview');
      }
      
      // For drive.google.com, ensure it's in preview mode
      if (urlObj.hostname.includes('drive.google.com') && url.includes('/view')) {
        return url.replace('/view', '/preview');
      }
      
      // If it's already a preview URL or doesn't need conversion, return as is
      return url;
    }
    
    // Return original URL for other embeddable sites
    return url;
  } catch {
    return url;
  }
}

// Function to render content with clickable links (URLs, file paths, and API endpoints)
export function renderContentWithLinks(content: string, onLinkClick: (url: string) => void) {
  const links = extractAllLinks(content);
  
  if (links.length === 0) {
    return content;
  }
  
  const parts = content.split(LINK_REGEX);
  
  return parts.map((part, index) => {
    if (links.includes(part)) {
      const isFile = isFilePath(part);
      const isApi = isApiEndpoint(part);
      
      let linkColor = "text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300";
      let tooltipText = `Open link: ${part}`;
      
      if (isFile) {
        linkColor = "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300";
        tooltipText = `Open file: ${part}`;
      } else if (isApi) {
        linkColor = "text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300";
        tooltipText = `Open API endpoint: ${part}`;
      }
      
      return (
        <button
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Use onLinkClick for all types - let the chat interface handle iframe display
            onLinkClick(part);
          }}
          className={`${linkColor} underline break-all cursor-pointer font-medium`}
          type="button"
          title={tooltipText}
        >
          {part}
        </button>
      );
    }
    return part;
  });
}
