# Signal MCP Server

An MCP (Model Context Protocol) server for accessing local Signal Desktop messages. This TypeScript/Node.js implementation allows AI assistants to read your Signal chat history.

Ported to Node/Typescript from the [stefanstranger/signal-mcp-server](https://github.com/stefanstranger/signal-mcp-server) project in Python for easier use with Claude and MCPB packaging.

## Features

- List all Signal chats with contact names and message counts
- Retrieve messages from specific chats with pagination
- Search for text within chat messages
- Prompt templates for chat analysis

## Prerequisites

- Node.js 18 or higher
- Signal Desktop installed with existing message history
- macOS, Windows, or Linux

## Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/anthropics/signal-mcp-server.git
   cd signal-mcp-server
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Add to your Claude Desktop configuration (`claude_desktop_config.json`):

   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   
   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "signal-mcp-server": {
         "command": "node",
         "args": ["PATH_TO_signal-mcp-server/dist/index.js"]
       }
     }
   }
   ```

4. Restart Claude Desktop.

## Configuration

### Environment Variables (Optional)

- `SIGNAL_SOURCE_DIR`: Custom path to Signal Desktop data directory
- `SIGNAL_KEY`: Encryption key (auto-detected on macOS via Keychain)

### Signal Data Directory Locations

The server automatically detects your Signal data directory:

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Signal` |
| Windows | `%APPDATA%\Signal` |
| Linux | `~/.config/Signal` |
| Linux (Flatpak) | `~/.var/app/org.signal.Signal/config/Signal` |

### Encryption Key

Signal Desktop encrypts its database using SQLCipher. The server handles this automatically:

- **macOS**: Retrieves the key from the system Keychain ("Signal Safe Storage")
- **Other platforms**: Reads from `config.json` in the Signal data directory

If automatic detection fails, you can provide the key via the `SIGNAL_KEY` environment variable.

## Available Tools

### `signal_list_chats`

Lists all Signal chats with their details.

**Parameters:**
- `include_empty` (boolean): Include chats with no messages (default: false)

**Example response:**
```json
[
  {
    "id": "abc123",
    "name": "John Doe",
    "number": "+1234567890",
    "type": "private",
    "totalMessages": 150
  }
]
```

### `signal_get_chat_messages`

Retrieves messages from a specific chat.

**Parameters:**
- `chat_name` (string, required): Name of the contact or group
- `limit` (number): Maximum messages to return
- `offset` (number): Skip this many messages (for pagination)

**Example response:**
```json
[
  {
    "date": "2024-01-15T10:30:00.000Z",
    "sender": "John Doe",
    "body": "Hello!",
    "reactions": [],
    "attachments": ""
  }
]
```

### `signal_search_chat`

Search for text within a chat's messages.

**Parameters:**
- `chat_name` (string, required): Name of the contact or group
- `query` (string, required): Text to search for
- `limit` (number): Maximum results to return

## Available Prompts

- `signal_summarize_chat_prompt` - Summarize recent messages in a chat
- `signal_chat_topic_prompt` - Analyze discussion topics
- `signal_chat_sentiment_prompt` - Analyze message sentiment
- `signal_search_chat_prompt` - Search for specific content

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## Important Notes

- **Signal Desktop must be closed** when accessing the database to avoid conflicts
- This server reads messages locally; no data is sent externally
- Uses Signal's official `@signalapp/better-sqlite3` fork with SQLCipher support

## Security & Privacy

This server provides access to your personal Signal messages. Please:

- Only run this server locally
- Never expose it to the internet
- Be mindful of the privacy of others in your conversations
- Review which AI tools you grant access to your messages

## License

MIT License
