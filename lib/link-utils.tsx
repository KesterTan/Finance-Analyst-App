// Utility functions for link detection and iframe handling
import React from 'react';

// Regular expression to detect URLs (improved to handle markdown links)
export const URL_REGEX = /(https?:\/\/[^\s\)]+)/g;

// Regular expression to detect markdown-style links [text](url)
export const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

// Function to extract URLs from text (including markdown links)
export function extractUrls(text: string): string[] {
  const urls: string[] = [];
  
  // Extract markdown links
  const markdownMatches = Array.from(text.matchAll(MARKDOWN_LINK_REGEX));
  markdownMatches.forEach(match => {
    urls.push(match[2]); // The URL part of [text](url)
  });
  
  // Extract plain URLs (but ignore those already captured in markdown)
  const plainMatches = text.match(URL_REGEX) || [];
  plainMatches.forEach(url => {
    // Check if this URL is not already captured as part of a markdown link
    const isInMarkdown = markdownMatches.some(match => match[0].includes(url));
    if (!isInMarkdown) {
      urls.push(url);
    }
  });
  
  return urls;
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
      
      // Special handling for Google Sheets
      if (urlObj.hostname.includes('sheets.google.com') || 
          (urlObj.hostname.includes('docs.google.com') && url.includes('/spreadsheets/'))) {
        
        // Extract the sheet ID from various URL formats
        const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch) {
          const sheetId = sheetIdMatch[1];

          // Try the pubhtml format first (works best for embedding all sheets)
          // If that fails, the iframe will show an error and we can fall back
          const pubhtmlUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pubhtml?widget=true&headers=false`;
          
          // For now, let's use the edit URL with minimal UI which usually works
          // and preserves sheet tabs at the bottom
          return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&rm=minimal`;
        }
      }
      
      // Convert edit URLs to preview format for other Google services
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
  let processedContent = content;
  const elements: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let elementKey = 0;
  
  // First, process markdown links [text](url)
  const markdownMatches = Array.from(content.matchAll(MARKDOWN_LINK_REGEX));
  
  // Define match types
  type MatchType = 'markdown' | 'plain';
  
  // Sort matches by their position in the string
  const allMatches: Array<{
    type: MatchType;
    match: RegExpMatchArray;
    start: number;
    end: number;
    text: string;
    url: string;
  }> = [
    ...markdownMatches.map(match => ({
      type: 'markdown' as MatchType,
      match,
      start: match.index!,
      end: match.index! + match[0].length,
      text: match[1], // The display text
      url: match[2]   // The URL
    }))
  ];
  
  // Add plain URL matches that aren't part of markdown links
  const plainUrlMatches = Array.from(content.matchAll(URL_REGEX));
  plainUrlMatches.forEach(match => {
    const isInMarkdown = markdownMatches.some(mdMatch => 
      match.index! >= mdMatch.index! && 
      match.index! < mdMatch.index! + mdMatch[0].length
    );
    
    if (!isInMarkdown) {
      allMatches.push({
        type: 'plain' as MatchType,
        match,
        start: match.index!,
        end: match.index! + match[0].length,
        text: match[0], // The URL itself as display text
        url: match[0]   // The URL
      });
    }
  });
  
  // Sort all matches by position
  allMatches.sort((a, b) => a.start - b.start);
  
  // Build the final content with clickable links
  allMatches.forEach(({ start, end, text, url }) => {
    // Add text before the link
    if (start > lastIndex) {
      elements.push(content.slice(lastIndex, start));
    }
    
    // Add the clickable link
    elements.push(
      <button
        key={elementKey++}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLinkClick(url);
        }}
        className="text-blue-500 hover:text-blue-700 underline break-all cursor-pointer"
        type="button"
      >
        {text}
      </button>
    );
    
    lastIndex = end;
  });
  
  // Add remaining text after the last link
  if (lastIndex < content.length) {
    elements.push(content.slice(lastIndex));
  }
  
  return elements.length > 0 ? elements : content;
}
