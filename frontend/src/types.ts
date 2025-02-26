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
  text: string;
  date: string;
  isOutgoing?: boolean;
}

export type Decision = 'keep' | 'remove' | 'pending';

export interface ProfileDecision {
  profileUrl: string;
  decision: Decision;
  timestamp: number;
}