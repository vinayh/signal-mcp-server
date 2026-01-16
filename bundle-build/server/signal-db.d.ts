export interface Contact {
    id: string;
    serviceId: string;
    name: string | null;
    number: string | null;
    profileName: string | null;
    type: "private" | "group";
}
export interface Message {
    id: string;
    conversationId: string;
    timestamp: number;
    sentAt: number | null;
    source: string | null;
    body: string | null;
    quote: string | null;
    sticker: string | null;
    reactions: Reaction[] | null;
    hasAttachments: boolean;
    type: string;
}
export interface Reaction {
    emoji: string;
    fromId: string;
    timestamp: number;
}
export interface ChatInfo extends Contact {
    totalMessages: number;
}
export interface FormattedMessage {
    date: string;
    sender: string;
    body: string;
    quote: string;
    sticker: string;
    reactions: Reaction[];
    attachments: string;
}
export declare class SignalDatabase {
    private password?;
    private key?;
    private db;
    private sourceDir;
    private selfServiceId;
    constructor(sourceDir?: string, password?: string | undefined, key?: string | undefined);
    private open;
    private loadSelfContact;
    close(): void;
    listChats(options?: {
        chats?: string;
        includeEmpty?: boolean;
        includeDisappearing?: boolean;
    }): ChatInfo[];
    getChatMessages(chatName: string, options?: {
        limit?: number;
        offset?: number;
        chats?: string;
        includeEmpty?: boolean;
        includeDisappearing?: boolean;
    }): FormattedMessage[];
    searchChat(chatName: string, query: string, options?: {
        limit?: number;
        chats?: string;
        includeEmpty?: boolean;
        includeDisappearing?: boolean;
    }): FormattedMessage[];
    private formatMessage;
}
//# sourceMappingURL=signal-db.d.ts.map