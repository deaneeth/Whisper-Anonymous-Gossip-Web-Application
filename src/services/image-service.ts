// image-service.ts - Handles image processing and metadata stripping

import EXIF from 'exif-js';

// Interface for image metadata
interface ImageMetadata {
  hasGPS: boolean;
  originalDatetime?: string;
  make?: string;
  model?: string;
  software?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  [key: string]: any;
}

// Image processing service
export class ImageService {
  // Convert a File/Blob to a base64 string
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Extract metadata from an image file
  static async extractMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve) => {
      EXIF.getData(file as any, function(this: any) {
        const metadata: ImageMetadata = {
          hasGPS: false
        };
        
        // Extract basic metadata
        const allTags = EXIF.getAllTags(this);
        
        if (allTags) {
          metadata.originalDatetime = allTags.DateTime;
          metadata.make = allTags.Make;
          metadata.model = allTags.Model;
          metadata.software = allTags.Software;
          
          // Check for GPS data
          if (allTags.GPSLatitude && allTags.GPSLongitude) {
            metadata.hasGPS = true;
            metadata.gpsLatitude = EXIF.getTag(this, "GPSLatitude");
            metadata.gpsLongitude = EXIF.getTag(this, "GPSLongitude");
          }
          
          // Add all other tags
          Object.keys(allTags).forEach(key => {
            metadata[key] = allTags[key];
          });
        }
        
        resolve(metadata);
      });
    });
  }
  
  // Strip metadata from an image and return a clean version
  static async stripMetadata(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Convert image to a clean canvas (which removes EXIF data)
        const img = new Image();
        const URL = window.URL || window.webkitURL;
        
        img.onload = () => {
          // Create a clean canvas with the image dimensions
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          // Draw the image to the canvas (this strips the metadata)
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Convert the canvas back to a Blob
          canvas.toBlob((blob) => {
            if (blob) {
              URL.revokeObjectURL(img.src); // Clean up
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, file.type); // Use the same MIME type as the original
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(img.src); // Clean up
          reject(new Error('Failed to load image'));
        };
        
        // Load the image from the file
        img.src = URL.createObjectURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Resize an image to maximum dimensions while preserving aspect ratio
  static async resizeImage(
    file: File | Blob, 
    maxWidth: number = 1200, 
    maxHeight: number = 1200, 
    quality: number = 0.85
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        const URL = window.URL || window.webkitURL;
        
        img.onload = () => {
          // Calculate new dimensions
          let width = img.naturalWidth;
          let height = img.naturalHeight;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }
          
          // Create a canvas with the new dimensions
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Draw the resized image
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              URL.revokeObjectURL(img.src); // Clean up
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/jpeg', quality); // Always output as JPEG for better compression
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(img.src); // Clean up
          reject(new Error('Failed to load image'));
        };
        
        // Load the image
        img.src = URL.createObjectURL(file);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Process an image: strip metadata, resize, and convert to base64
  static async processImage(file: File): Promise<string> {
    try {
      // First, strip all metadata
      const cleanBlob = await this.stripMetadata(file);
      
      // Then resize the image to reasonable dimensions
      const resizedBlob = await this.resizeImage(cleanBlob);
      
      // Convert to base64 for storage
      return await this.blobToBase64(resizedBlob);
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image. Please try again with a different image.');
    }
  }
  
  // Helper to convert Blob to base64
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read blob'));
      };
      
      reader.readAsDataURL(blob);
    });
  }
}