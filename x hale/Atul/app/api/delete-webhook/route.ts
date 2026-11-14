import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN } from '../../../components/constent';

export async function GET() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: 'Webhook deleted successfully',
        data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.description,
        data
      }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
