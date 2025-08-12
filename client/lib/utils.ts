import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Validation utilities for PII detection
export function containsEmail(text: string): boolean {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  return emailRegex.test(text);
}

export function containsPhone(text: string): boolean {
  // Basic phone number patterns
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return phoneRegex.test(text);
}

export function containsAddress(text: string): boolean {
  // Basic address patterns - street numbers with common address keywords
  const addressRegex = /\b\d+\s+([\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl|boulevard|blvd))\b/i;
  return addressRegex.test(text);
}

export function containsPII(text: string): boolean {
  return containsEmail(text) || containsPhone(text) || containsAddress(text);
}

export function maskPII(text: string): string {
  let masked = text;
  
  // Mask emails
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // Mask phone numbers
  masked = masked.replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]');
  
  // Mask addresses (basic)
  masked = masked.replace(/\b\d+\s+([\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl|boulevard|blvd))\b/gi, '[ADDRESS]');
  
  return masked;
}
