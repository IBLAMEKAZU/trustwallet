import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN, CHAT_ID } from '../../../components/constent';

export async function GET() {
  try {
    // Send test message to verify bot is working
    const message = `🤖 <b>Bot Test</b>\n\n✅ Bot is working!\n\nCommands:\n/start - Start bot\n/connect - Connect wallet\n/balance - Check balance\n/pull - Pull USDT`;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent to Telegram',
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
