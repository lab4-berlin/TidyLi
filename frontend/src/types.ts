export interface Profile {
  firstName: string;
  lastName: string;
  url: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
  profilePicture?: string;
  messages?: Message[];
}

export interface Message {
  conversationId: string;
  title: string;
  from: string;
  senderProfileUrl: string;
  to: string;
  recipientProfileUrls: string;
  date: string;
  subject: string;
  content: string;
  folder: string;
  isDraft: boolean;
  isConversationDraft: boolean;
}

export type Decision = 'keep' | 'remove';

export interface ProfileDecision {
  profileUrl: string;
  decision: Decision;
  timestamp: number;
}