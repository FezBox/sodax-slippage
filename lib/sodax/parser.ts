import Decimal from 'decimal.js';

export interface ParsedMessage {
  type: 'quote' | 'fill' | 'unknown';
  fromAmount?: Decimal;
  fromToken?: string;
  fromChain?: string;
  toAmount?: Decimal;
  toToken?: string;
  toChain?: string;
  rawDetail: string;
}

export function parseActionDetail(detail: string): ParsedMessage {
  // Example: "IntentSwap 73.541165 USDC(arbitrum) -> 5.061095891887000125 AVAX(avax)"
  // Example: "IntentFilled 73.541165 USDC(arbitrum) -> 5.163011091280152576 AVAX(avax)"
  // Example: "CreateIntent 73.541165 USDC(arbitrum) -> 5.061095891887000125 AVAX(avax)"

  const regex = /^(IntentSwap|CreateIntent|IntentFilled)\s+([\d\.]+)\s+(\w+)\(([\w\.]+)\)\s+->\s+([\d\.]+)\s+(\w+)\(([\w\.]+)\)/;
  const match = detail.match(regex);

  if (!match) {
    return { type: 'unknown', rawDetail: detail };
  }

  const [, actionType, fromAmountStr, fromToken, fromChain, toAmountStr, toToken, toChain] = match;

  const isQuote = actionType === 'IntentSwap' || actionType === 'CreateIntent';
  const isFill = actionType === 'IntentFilled';

  return {
    type: isQuote ? 'quote' : isFill ? 'fill' : 'unknown',
    fromAmount: new Decimal(fromAmountStr),
    fromToken,
    fromChain,
    toAmount: new Decimal(toAmountStr),
    toToken,
    toChain,
    rawDetail: detail,
  };
}
