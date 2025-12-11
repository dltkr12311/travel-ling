import { GroupChatMessage, Person } from '../../types';

export interface ChatRoomProps {
  currentUserId: string;
  people: Person[];
  messages: GroupChatMessage[];
  onSendMessage: (text: string) => void;
}
