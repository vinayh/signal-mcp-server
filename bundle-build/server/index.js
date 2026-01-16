#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { SignalDatabase } from "./signal-db.js";
// Logging utility - always write to stderr to keep stdout clean for MCP protocol
function log(level, message, data) {
    const timestamp = new Date().toISOString();
    const logMessage = data
        ? `[${timestamp}] [${level.toUpperCase()}] ${message}: ${JSON.stringify(data)}`
        : `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.error(logMessage);
}
// Create the MCP server
const server = new Server({
    name: "signal-desktop-mcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
        prompts: {},
    },
});
// Define the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "signal_list_chats",
                description: "List all Signal chats with their details including contact names, numbers, and message counts",
                inputSchema: {
                    type: "object",
                    properties: {
                        source_dir: {
                            type: "string",
                            description: "Path to the Signal data directory (optional)",
                        },
                        password: {
                            type: "string",
                            description: "Password for encrypted data, if applicable",
                        },
                        key: {
                            type: "string",
                            description: "Key for encrypted data, if applicable",
                        },
                        chats: {
                            type: "string",
                            description: "Comma-separated list of chat IDs to filter",
                        },
                        include_empty: {
                            type: "boolean",
                            description: "Whether to include empty chats",
                            default: false,
                        },
                        include_disappearing: {
                            type: "boolean",
                            description: "Whether to include disappearing messages",
                            default: true,
                        },
                    },
                },
            },
            {
                name: "signal_get_chat_messages",
                description: "Get Signal messages from a specific chat by name with pagination support",
                inputSchema: {
                    type: "object",
                    properties: {
                        chat_name: {
                            type: "string",
                            description: "The name of the chat to retrieve messages from",
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of messages to return",
                        },
                        offset: {
                            type: "number",
                            description: "Number of messages to skip before starting to collect results",
                            default: 0,
                        },
                        source_dir: {
                            type: "string",
                            description: "Path to the Signal data directory (optional)",
                        },
                        password: {
                            type: "string",
                            description: "Password for encrypted data, if applicable",
                        },
                        key: {
                            type: "string",
                            description: "Key for encrypted data, if applicable",
                        },
                        chats: {
                            type: "string",
                            description: "Comma-separated list of chat IDs to filter",
                        },
                        include_empty: {
                            type: "boolean",
                            description: "Whether to include empty chats",
                            default: false,
                        },
                        include_disappearing: {
                            type: "boolean",
                            description: "Whether to include disappearing messages",
                            default: true,
                        },
                    },
                    required: ["chat_name"],
                },
            },
            {
                name: "signal_search_chat",
                description: "Search for specific text within a Signal chat",
                inputSchema: {
                    type: "object",
                    properties: {
                        chat_name: {
                            type: "string",
                            description: "The name of the chat to search within",
                        },
                        query: {
                            type: "string",
                            description: "The text to search for in messages",
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of matching messages to return",
                        },
                        source_dir: {
                            type: "string",
                            description: "Path to the Signal data directory (optional)",
                        },
                        password: {
                            type: "string",
                            description: "Password for encrypted data, if applicable",
                        },
                        key: {
                            type: "string",
                            description: "Key for encrypted data, if applicable",
                        },
                        chats: {
                            type: "string",
                            description: "Comma-separated list of chat IDs to filter",
                        },
                        include_empty: {
                            type: "boolean",
                            description: "Whether to include empty chats",
                            default: false,
                        },
                        include_disappearing: {
                            type: "boolean",
                            description: "Whether to include disappearing messages",
                            default: true,
                        },
                    },
                    required: ["chat_name", "query"],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    log("info", `Tool call received: ${name}`, { arguments: args });
    try {
        // Create a new database connection with any provided overrides
        const sourceDir = args?.source_dir || process.env.SIGNAL_SOURCE_DIR;
        const key = args?.key || process.env.SIGNAL_KEY;
        log("debug", "Creating database connection", {
            sourceDir: sourceDir || "(auto-detect)",
            keyProvided: !!key
        });
        const db = new SignalDatabase(sourceDir, undefined, key);
        try {
            switch (name) {
                case "signal_list_chats": {
                    log("debug", "Listing chats");
                    const chats = db.listChats({
                        chats: args?.chats,
                        includeEmpty: args?.include_empty,
                        includeDisappearing: args?.include_disappearing,
                    });
                    log("info", `Found ${chats.length} chats`);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(chats, null, 2),
                            },
                        ],
                    };
                }
                case "signal_get_chat_messages": {
                    const chatName = args?.chat_name;
                    if (!chatName) {
                        throw new Error("chat_name is required");
                    }
                    log("debug", `Getting messages for chat: ${chatName}`);
                    const messages = db.getChatMessages(chatName, {
                        limit: args?.limit,
                        offset: args?.offset,
                        chats: args?.chats,
                        includeEmpty: args?.include_empty,
                        includeDisappearing: args?.include_disappearing,
                    });
                    log("info", `Retrieved ${messages.length} messages from chat: ${chatName}`);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(messages, null, 2),
                            },
                        ],
                    };
                }
                case "signal_search_chat": {
                    const chatName = args?.chat_name;
                    const query = args?.query;
                    if (!chatName) {
                        throw new Error("chat_name is required");
                    }
                    if (!query) {
                        throw new Error("query is required");
                    }
                    log("debug", `Searching chat: ${chatName} for: ${query}`);
                    const messages = db.searchChat(chatName, query, {
                        limit: args?.limit,
                        chats: args?.chats,
                        includeEmpty: args?.include_empty,
                        includeDisappearing: args?.include_disappearing,
                    });
                    log("info", `Found ${messages.length} messages matching query in chat: ${chatName}`);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(messages, null, 2),
                            },
                        ],
                    };
                }
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        }
        finally {
            db.close();
            log("debug", "Database connection closed");
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log("error", `Tool ${name} failed`, { error: errorMessage });
        // Provide helpful error messages for common issues
        let userMessage = errorMessage;
        if (errorMessage.includes("database not found")) {
            userMessage = `Signal database not found. Make sure Signal Desktop is installed and has been run at least once. ${errorMessage}`;
        }
        else if (errorMessage.includes("encryption key") || errorMessage.includes("SQLITE_NOTADB")) {
            userMessage = `Could not decrypt Signal database. On macOS, make sure Signal Desktop has been opened at least once so the key is stored in Keychain. On other platforms, you may need to provide the encryption key. ${errorMessage}`;
        }
        else if (errorMessage.includes("SQLITE_BUSY") || errorMessage.includes("database is locked")) {
            userMessage = `Signal database is locked. Please close Signal Desktop before accessing messages. ${errorMessage}`;
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${userMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// Define the prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: "signal_summarize_chat_prompt",
                description: "Generate a summary prompt for recent messages in a specific chat",
                arguments: [
                    {
                        name: "chat_name",
                        description: "The name of the chat to summarize",
                        required: true,
                    },
                ],
            },
            {
                name: "signal_chat_topic_prompt",
                description: "Generate a prompt to analyze discussion topics in a chat",
                arguments: [
                    {
                        name: "chat_name",
                        description: "The name of the chat to analyze",
                        required: true,
                    },
                ],
            },
            {
                name: "signal_chat_sentiment_prompt",
                description: "Generate a prompt to analyze message sentiment in a chat",
                arguments: [
                    {
                        name: "chat_name",
                        description: "The name of the chat to analyze",
                        required: true,
                    },
                ],
            },
            {
                name: "signal_search_chat_prompt",
                description: "Generate a search prompt for finding specific text in a chat",
                arguments: [
                    {
                        name: "chat_name",
                        description: "The name of the chat to search",
                        required: true,
                    },
                    {
                        name: "query",
                        description: "The text to search for",
                        required: true,
                    },
                ],
            },
        ],
    };
});
// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
        case "signal_summarize_chat_prompt": {
            const chatName = args?.chat_name;
            if (!chatName) {
                throw new Error("chat_name is required");
            }
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Summarize the recent messages in the Signal chat named '${chatName}'.`,
                        },
                    },
                ],
            };
        }
        case "signal_chat_topic_prompt": {
            const chatName = args?.chat_name;
            if (!chatName) {
                throw new Error("chat_name is required");
            }
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `What are the topics of discussion in the Signal chat named '${chatName}'?`,
                        },
                    },
                ],
            };
        }
        case "signal_chat_sentiment_prompt": {
            const chatName = args?.chat_name;
            if (!chatName) {
                throw new Error("chat_name is required");
            }
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Analyze the sentiment of messages in the Signal chat named '${chatName}'.`,
                        },
                    },
                ],
            };
        }
        case "signal_search_chat_prompt": {
            const chatName = args?.chat_name;
            const query = args?.query;
            if (!chatName) {
                throw new Error("chat_name is required");
            }
            if (!query) {
                throw new Error("query is required");
            }
            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Search for the text '${query}' in the Signal chat named '${chatName}'.`,
                        },
                    },
                ],
            };
        }
        default:
            throw new Error(`Unknown prompt: ${name}`);
    }
});
// Start the server
async function main() {
    log("info", "Signal Desktop MCP Server starting...");
    log("info", `Node.js version: ${process.version}`);
    log("info", `Platform: ${process.platform}`);
    // Log configuration sources
    if (process.env.SIGNAL_SOURCE_DIR) {
        log("info", `Using SIGNAL_SOURCE_DIR from environment: ${process.env.SIGNAL_SOURCE_DIR}`);
    }
    if (process.env.SIGNAL_KEY) {
        log("info", "Using SIGNAL_KEY from environment");
    }
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("info", "Signal Desktop MCP Server started and ready for connections");
}
main().catch((error) => {
    log("error", "Fatal error during startup", { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
});
//# sourceMappingURL=index.js.map