import { useState } from 'react';
import {
  AIAction,
  processAIAssistantMessage,
  resolveItineraryPlace,
} from '../../../services/aiActionService';
import { Expense, ItineraryItem, Person, WeatherInfo } from '../../../types';
import { ChatMessage } from '../AIPlanner.types';

interface UseAIChatProps {
  people: Person[];
  budget: number;
  expenses: Expense[];
  itineraryCount: number;
  weatherInfo: WeatherInfo | null;
  onAddItinerary: (item: ItineraryItem) => void;
  onAddExpense: (expense: Expense) => void;
  onSetBudget: (amount: number) => void;
  onAddPerson: (name: string) => void;
}

export const useAIChat = (props: UseAIChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<AIAction | null>(null);

  const executeAction = async (
    action: AIAction,
    index: number = 0
  ): Promise<boolean> => {
    try {
      if (!action || !action.type) {
        console.error('Invalid action:', action);
        return false;
      }

      switch (action.type) {
        case 'add_itinerary': {
          const data = action.data;
          if (!data || !data.title || data.title.trim() === '') {
            console.error('Title is missing or empty:', data);
            return false;
          }

          try {
            const coords = await resolveItineraryPlace(data.title);
            const itemTime = data.time || null;
            const uniqueId = `${Date.now()}-${index}-${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            const newItem: ItineraryItem = {
              id: uniqueId,
              time: itemTime || '12:00',
              title: data.title.trim(),
              location: coords?.address || data.location || data.title,
              type: data.itemType || 'activity',
              notes: data.notes || '',
              lat: coords?.lat,
              lng: coords?.lng,
            };
            console.log(
              `✅ Adding itinerary item ${index + 1}:`,
              newItem.title
            );
            props.onAddItinerary(newItem);
            setLastAction(action);
            return true;
          } catch (error) {
            console.error(
              `❌ Failed to add itinerary item "${data.title}":`,
              error
            );
            return false;
          }
        }
        case 'add_expense': {
          const data = action.data;
          if (!data || !data.amount || !data.description) {
            console.error('Expense amount or description is missing:', data);
            return false;
          }
          try {
            let payerId = props.people[0]?.id || 'p1';
            if (data.payerName) {
              const foundPerson = props.people.find(p =>
                p.name.toLowerCase().includes(data.payerName.toLowerCase())
              );
              if (foundPerson) payerId = foundPerson.id;
            }
            const uniqueId = `${Date.now()}-${index}-${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            const newExpense: Expense = {
              id: uniqueId,
              amount: data.amount,
              description: data.description.trim(),
              payerId: payerId,
              date: new Date().toISOString(),
            };
            console.log(
              `✅ Adding expense ${index + 1}:`,
              newExpense.description
            );
            props.onAddExpense(newExpense);
            setLastAction(action);
            return true;
          } catch (error) {
            console.error(
              `❌ Failed to add expense "${data.description}":`,
              error
            );
            return false;
          }
        }
        case 'set_budget': {
          const data = action.data;
          if (!data || !data.budget || data.budget <= 0) {
            console.error('Budget data is invalid:', data);
            return false;
          }
          try {
            console.log(`✅ Setting budget:`, data.budget);
            props.onSetBudget(data.budget);
            setLastAction(action);
            return true;
          } catch (error) {
            console.error(`❌ Failed to set budget:`, error);
            return false;
          }
        }
        case 'add_person': {
          const data = action.data;
          if (!data || !data.personName || data.personName.trim() === '') {
            console.error('Person name is missing:', data);
            return false;
          }
          try {
            console.log(`✅ Adding person:`, data.personName);
            props.onAddPerson(data.personName.trim());
            setLastAction(action);
            return true;
          } catch (error) {
            console.error(
              `❌ Failed to add person "${data.personName}":`,
              error
            );
            return false;
          }
        }
        default: {
          console.error('Unknown action type:', action.type);
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Action execution error:', error, action);
      return false;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);
    setLastAction(null);

    const totalSpent = props.expenses.reduce((acc, cur) => acc + cur.amount, 0);

    const result = await processAIAssistantMessage(userText, {
      people: props.people,
      currentBudget: props.budget,
      totalSpent,
      itineraryCount: props.itineraryCount,
      sunriseTime: props.weatherInfo?.sunriseTime,
      weatherCondition: props.weatherInfo?.condition,
    });

    let actionExecuted = false;
    let successCount = 0;
    let failCount = 0;

    if (result.actions && result.actions.length > 0) {
      console.log(`Processing ${result.actions.length} actions from array`);
      actionExecuted = true;
      for (let i = 0; i < result.actions.length; i++) {
        const action = result.actions[i];
        const success = await executeAction(action, i);
        if (success) {
          successCount++;
        } else {
          failCount++;
          console.error(`❌ Action ${i + 1} failed:`, action);
        }
        if (i < result.actions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      console.log(
        `✅ Actions executed: ${successCount} succeeded, ${failCount} failed`
      );
    } else if (result.action) {
      actionExecuted = true;
      const success = await executeAction(result.action, 0);
      if (success) {
        successCount = 1;
      } else {
        failCount = 1;
        console.error('❌ Single action failed:', result.action);
      }
    }

    const registrationKeywords = ['등록', '추가', '기록', '저장'];
    const hasRegistrationText = registrationKeywords.some(keyword =>
      result.text.includes(keyword)
    );

    if (hasRegistrationText && !actionExecuted) {
      console.warn(
        '⚠️ WARNING: AI said it registered but no action was executed!',
        {
          text: result.text,
          hasAction: !!result.action,
          hasActions: !!(result.actions && result.actions.length > 0),
        }
      );
    }

    let finalText = result.text;
    if (actionExecuted && failCount > 0 && successCount === 0) {
      finalText = `${result.text}\n\n⚠️ 일부 일정 등록에 실패했어요. 다시 시도해주세요.`;
    } else if (actionExecuted && failCount > 0 && successCount > 0) {
      finalText = `${result.text}\n\n⚠️ ${successCount}개는 등록되었지만 ${failCount}개는 실패했어요.`;
    }

    setMessages(prev => [
      ...prev,
      {
        role: 'model',
        text: finalText,
        isMapResult: result.mapLinks && result.mapLinks.length > 0,
        mapLinks: result.mapLinks,
      },
    ]);
    setIsLoading(false);
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    lastAction,
    handleSend,
  };
};
