// Utility functions for link detection and iframe handling

// Regular expression to detect URLs
export const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Function to extract URLs from text
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

// Function to check if a URL is embeddable (not blocked by X-Frame-Options)
export function isEmbeddableUrl(url: string): boolean {
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

// Function to render content with clickable links
export function renderContentWithLinks(content: string, onLinkClick: (url: string) => void) {
  const urls = extractUrls(content);
  
  console.log(`Content: "${content}"`);
  console.log(`Extracted URLs:`, urls);
  
  if (urls.length === 0) {
    return content;
  }
  
  const parts = content.split(URL_REGEX);
  
  return parts.map((part, index) => {
    if (urls.includes(part)) {
      return (
        <button
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Button clicked for URL: ${part}`);
            onLinkClick(part);
          }}
          className="text-blue-500 hover:text-blue-700 underline break-all cursor-pointer"
          type="button"
        >
          {part}
        </button>
      );
    }
    return part;
  });
}
