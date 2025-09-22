import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageService {
  /**
   * Convert relative image path to full URL
   * @param imagePath - Relative path from database (e.g., "EXAMEN_INSTRUIRE_AUTO/B1/3/image4.png")
   * @returns Full URL to access the image (e.g., "http://localhost:3000/images/B1/3/image4.png")
   */
  getImageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    
    // Remove the "EXAMEN_INSTRUIRE_AUTO/" prefix since it's already configured as the static directory
    const cleanPath = imagePath.replace('EXAMEN_INSTRUIRE_AUTO/', '');
    
    // Get base URL from environment or use default
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    return `${baseUrl}/images/${cleanPath}`;
  }

  /**
   * Convert multiple image paths to URLs
   */
  getImageUrls(imagePaths: (string | null)[]): (string | null)[] {
    return imagePaths.map(path => this.getImageUrl(path));
  }
}