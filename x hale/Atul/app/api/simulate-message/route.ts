import { NextResponse } from 'next/server';
import { processMessage } from '../telegram-webhook/route';
import { CHAT_ID } from '../../../components/constent';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const command = searchParams.get('command') || '/start';
  const wallet = searchParams.get('wallet');
  const callback = searchParams.get('callback');

  let mockUpdate: any;

  if (callback) {
    // Simulate callback query (button click)
    mockUpdate = {
      callback_query: {
        id: '123',
        message: {
          message_id: 1,
          chat: {
            id: CHAT_ID,
          },
        },
        data: callback,
      },
    };
  } else {
    // Simulate text message
    mockUpdate = {
      message: {
        chat: {
          id: CHAT_ID,
        },
        text: wallet || command,
      },
    };
  }

  try {
    await processMessage(mockUpdate);
    return NextResponse.json({
      success: true,
      message: 'Message processed',
      command: wallet || command,
      callback
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
