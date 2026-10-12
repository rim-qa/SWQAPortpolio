import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('file') || 'ecommerce';

  // 허용된 샘플 파일 목록 (10~99개 TC용 소형/중형 샘플 포함)
  const allowedFiles: Record<string, string> = {
    'quick': 'Quick_Demo_5_Requirements.csv', // 5건 -> 20개 TC
    'core': 'Core_Commerce_12_Requirements.csv', // 12건 -> 48개 TC
    'ecommerce': 'E-commerce_Requirements_v2.csv', // 55건 -> 220개 TC
    'healthcare': 'Healthcare_Requirements_v2.csv', // 50건 -> 200개 TC
    'hr': 'HR_System_Requirements_v2.csv', // 48건 -> 192개 TC
    'banking': 'Mobile_Banking_Requirements_v2.csv', // 50건 -> 200개 TC
    'social': 'Social_Media_Requirements_v2.csv', // 45건 -> 180개 TC
  };

  const targetFile = allowedFiles[fileName.toLowerCase()] || fileName;

  try {
    const filePath = path.join(process.cwd(), targetFile);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(targetFile)}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
