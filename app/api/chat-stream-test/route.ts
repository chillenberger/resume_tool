// import { get as streamResponse } from '@/services/chat-stream-test'
import { chatStream as streamResponse } from '@/services/chat-service'

export async function POST(request: Request, _context: any) {
  // For POST, we could parse the request body if needed.
  // Here, we just return the same streaming response for testing.
  const baseResponse = await streamResponse(await request.formData());

  return new Response(baseResponse.body, {
    status: baseResponse.status || 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
} 