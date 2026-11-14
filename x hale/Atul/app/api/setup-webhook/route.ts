import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN } from '../../../components/constent';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const webhookUrl = searchParams.get('url');

  if (!webhookUrl) {
    return NextResponse.json({
      error: 'Please provide webhook URL as query parameter: ?url=https://your-domain.com/api/telegram-webhook'
    }, { status: 400 });
  }

  try {
    console.log('Setting webhook:', webhookUrl);

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: 'Webhook set successfully',
        webhookUrl,
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
