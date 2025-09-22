import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';

@Controller('images')
export class ImagesController {
  @Get('*')
  serveImage(@Param('0') imagePath: string, @Res() res: Response) {
    // Construct the full path to the image
    const fullPath = join(__dirname, '..', '..', 'EXAMEN_INSTRUIRE_AUTO', imagePath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Image not found');
    }

    // Determine content type based on file extension
    const extension = imagePath.toLowerCase().split('.').pop();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case 'png':
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
    }

    // Set headers
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });

    // Stream the file
    const fileStream = createReadStream(fullPath);
    fileStream.pipe(res);
  }
}