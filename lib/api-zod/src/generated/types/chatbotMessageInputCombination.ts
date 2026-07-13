
export type ChatbotMessageInputCombination = typeof ChatbotMessageInputCombination[keyof typeof ChatbotMessageInputCombination] | null;


export const ChatbotMessageInputCombination = {
  science: 'science',
  arts: 'arts',
  both: 'both',
} as const;
