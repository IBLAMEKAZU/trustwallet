import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN, CHAT_ID } from '../../../components/constent';

export async function GET() {
  const testAddress = '0x1234567890123456789012345678901234567890';
  const message = `🧪<b>Test Notification</b>\n🧾 Test Wallet: <code>${testAddress}</code>\n⏰ Time: ${new Date().toISOString()}`;
  
  try {
    console.log('Sending test notification to Telegram...');
    console.log('Bot Token:', TELEGRAM_BOT_TOKEN ? 'Set' : 'NOT SET');
    console.log('Chat ID:', CHAT_ID ? 'Set' : 'NOT SET');
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
    
    const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    
    if (data.ok) {
      console.log('✅ Telegram notification sent successfully!');
      console.log('Message ID:', data.result?.message_id);
      return NextResponse.json({
        success: true,
        message: 'Telegram notification sent successfully',
        messageId: data.result?.message_id,
        data
      });
    } else {
      console.log('❌ Failed to send Telegram notification');
      console.log('Error:', data.description);
      return NextResponse.json({
        success: false,
        message: 'Failed to send Telegram notification',
        error: data.description,
        data
      }, { status: 400 });
    }
  } catch (err) {
    console.error('❌ Error sending Telegram notification:', err);
    return NextResponse.json({
      success: false,
      message: 'Error sending Telegram notification',
      error: (err as Error).message
    }, { status: 500 });
  }
}
