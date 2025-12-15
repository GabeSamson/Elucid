import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/auth';
import crypto from 'crypto';

// POST /api/admin/upload - Upload product images
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderValue = formData.get('folder')?.toString();
    const allowedFolders = ['products', 'collections', 'photoshoot', 'hero', 'branding', 'lock'] as const;
    const targetFolder: string = allowedFolders.includes(folderValue as any) ? (folderValue as string) : 'products';
    const allowSvg = targetFolder === 'hero' || targetFolder === 'lock';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const baseValidTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    const validTypes = allowSvg ? [...baseValidTypes, 'image/svg+xml'] : baseValidTypes;
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Only ${allowSvg ? 'JPEG, PNG, WebP, ICO, and SVG' : 'JPEG, PNG, WebP, and ICO'} are allowed.` },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Map MIME types to safe file extensions (whitelist)
    const mimeToExtension: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'image/svg+xml': 'svg',
    };

    // Get safe extension from MIME type (not from user input)
    const extension = mimeToExtension[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: 'Invalid file type mapping' },
        { status: 400 }
      );
    }

    // Generate unique filename with cryptographically secure randomness
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex'); // 32 characters
    const folderPrefixMap: { [key: string]: string } = {
      'collections': 'collection',
      'photoshoot': 'photoshoot',
      'hero': 'hero',
      'branding': 'branding',
      'lock': 'lock',
      'products': 'product',
    };
    const filePrefix = folderPrefixMap[targetFolder] || 'product';
    const filename = `${targetFolder}/${filePrefix}-${timestamp}-${randomBytes}.${extension}`;

    let fileToUpload: Blob | File = file;
    let contentType = file.type;

    // Sanitize and force white fill for hero SVG uploads
    if (file.type === 'image/svg+xml') {
      const arrayBuffer = await file.arrayBuffer();
      let svgContent = Buffer.from(arrayBuffer).toString('utf-8');

      // Strip scripts and inline event handlers as a basic safety measure
      svgContent = svgContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      svgContent = svgContent.replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '');

      const whiteStyle = '<style>*{fill:#ffffff!important;stroke:#ffffff!important;}</style>';
      const svgTagMatch = svgContent.match(/<svg[^>]*>/i);

      if (svgTagMatch && typeof svgTagMatch.index === 'number') {
        const insertIndex = svgTagMatch.index + svgTagMatch[0].length;
        svgContent = `${svgContent.slice(0, insertIndex)}${whiteStyle}${svgContent.slice(insertIndex)}`;
      } else {
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg">${whiteStyle}${svgContent}</svg>`;
      }

      fileToUpload = new Blob([svgContent], { type: 'image/svg+xml' });
      contentType = 'image/svg+xml';
    }

    // Upload to Vercel Blob
    const blob = await put(filename, fileToUpload, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: blob.pathname,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
