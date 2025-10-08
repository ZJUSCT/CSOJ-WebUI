"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import api from '@/lib/api';

/**
 * A custom hook to fetch and display images from authenticated routes.
 * It handles fetching image data with an Authorization header and creating a local blob URL.
 * @param src The URL of the image to display. Can be a relative API path or a full external URL.
 * @returns A URL (either the original absolute URL or a new temporary blob URL) suitable for an <img> src attribute.
 */
export const useAuthenticatedImage = (src: string | undefined | null) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    // A flag to prevent state updates if the component unmounts during the fetch.
    let isMounted = true; 
    // This will hold the generated blob URL so we can clean it up.
    let objectUrl: string | null = null;

    const fetchImage = async (relativePath: string) => {
      if (!token) {
        // Can't fetch if there's no token.
        return;
      }
      try {
        const response = await fetch(relativePath, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setImageUrl(objectUrl);
        }
      } catch (error) {
        console.error("Error fetching authenticated image:", error);
        if (isMounted) {
          setImageUrl(null); // Set to null on error to show fallback or nothing.
        }
      }
    };

    if (src && !src.startsWith('http')) {
      // It's a relative path, so it needs to be fetched with authentication.
      fetchImage(src);
    } else {
      // It's a full URL (like from GitLab) or null/undefined, use it directly.
      setImageUrl(src || null);
    }

    // Cleanup function: this runs when the component unmounts or `src` changes.
    return () => {
      isMounted = false;
      if (objectUrl) {
        // Revoke the blob URL to free up browser memory.
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, token]);

  return imageUrl;
};