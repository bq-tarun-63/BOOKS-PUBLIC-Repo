import { type NextRequest, NextResponse } from 'next/server';
import { NoteService } from '@/services/noteService';
import { getAuthenticatedUser, isAuthError } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (isAuthError(auth)) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    const { user } = auth;
    const { id, coverUrl } = await req.json();
   
    const updateCover = await NoteService.updateCover({id,coverUrl});
    
    return NextResponse.json({
      url: updateCover.url,
      id: updateCover.id
    });
  } catch (error) {
    console.error('Error uploading cover:', error);
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}


