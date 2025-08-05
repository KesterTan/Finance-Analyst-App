# AI Finance Analyst - Frontend

This is the Next.js frontend for the AI Finance Analyst application. It connects to a Flask backend API to provide financial analysis capabilities.

## Prerequisites

Before running this application, make sure you have:

1. **Node.js** (version 18 or higher)
2. **npm** or **pnpm** installed
3. **Flask Backend** running (see Flask API setup below)

## Getting Started

### 1. Install Dependencies

First, resolve the React 19 compatibility issue and install dependencies:

```bash
# Update vaul to a React 19 compatible version
npm install vaul@latest

# Install all dependencies
npm install
```

### 2. Environment Configuration

The app is configured to connect to your Flask backend. By default, it expects the Flask API to run on `http://localhost:5000`.

If your Flask backend runs on a different URL, create or update `.env.local`:

```bash
FLASK_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME="AI Finance Analyst"
```

### 3. Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Flask Backend Setup

This frontend requires the Flask backend to be running. Make sure you have the Flask API running with the following endpoints:

- `GET /health` - Health check
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/{id}/messages` - Get conversation messages
- `POST /api/conversations/{id}/messages` - Send message
- `DELETE /api/conversations/{id}` - Delete conversation
- `GET /api/capabilities` - Get AI capabilities

### Starting the Flask Backend

Navigate to your Flask backend directory and run:

```bash
python app.py
```

Make sure the Flask server is running on the port specified in your `FLASK_API_URL` environment variable (default: `http://localhost:5000`).

## Testing the Connection

You can test if the frontend can connect to the Flask backend by visiting:

```
http://localhost:3000/api/health
```

This endpoint will show:
- ✅ "healthy" if both Next.js and Flask are working
- ❌ "unhealthy" if Flask backend is not accessible

## Features

- **Real-time Chat Interface**: Send messages to the AI Finance Analyst
- **Conversation Management**: Create, view, and delete conversations
- **Flask API Integration**: All data comes from your Flask backend
- **Error Handling**: Graceful error messages when Flask backend is unavailable
- **Responsive Design**: Works on desktop and mobile devices

## API Integration

The app now connects to your Flask backend instead of using mock data. The integration includes:

### Configuration (`lib/config.ts`)
- Centralized API configuration
- Timeout handling
- URL building utilities

### API Routes (`app/api/`)
- `/api/conversations` - Proxies to Flask `/api/conversations`
- `/api/conversations/[id]/messages` - Proxies to Flask `/api/conversations/{id}/messages`
- `/api/conversations/[id]` - Proxies to Flask `/api/conversations/{id}`
- `/api/capabilities` - Proxies to Flask `/api/capabilities`
- `/api/health` - Health check for both Next.js and Flask

### Error Handling
- Connection timeouts (30 seconds)
- Graceful fallbacks when Flask is unavailable
- User-friendly error messages
- Console logging for debugging

## Troubleshooting

### Common Issues

1. **"Failed to fetch" errors**: Make sure your Flask backend is running on the correct port
2. **CORS errors**: Ensure your Flask backend has CORS configured for `http://localhost:3000`
3. **Timeout errors**: Check if your Flask backend is responding within 30 seconds

### Debug Steps

1. Check Flask backend health:
   ```bash
   curl http://localhost:5000/health
   ```

2. Check Next.js health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. View browser console for detailed error messages

4. Check Flask backend logs for API call details

## Development

### Project Structure

```
├── app/
│   ├── api/           # Next.js API routes (proxy to Flask)
│   ├── chat/          # Chat interface pages
│   └── settings/      # Settings page
├── components/        # React components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and configuration
└── public/           # Static assets
```

### Key Files

- `lib/config.ts` - Flask API configuration
- `hooks/use-chat.ts` - Chat functionality
- `hooks/use-conversations.ts` - Conversation management
- `components/chat-interface.tsx` - Main chat UI

## Building for Production

```bash
npm run build
npm start
```

Make sure to update the `FLASK_API_URL` environment variable to point to your production Flask backend URL.
