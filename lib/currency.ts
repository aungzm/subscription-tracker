// Currency conversion utility using fawazahmed0/exchange-api

interface ExchangeRates {
  [currency: string]: number;
}

interface ExchangeAPIResponse {
  date: string;
  [baseCurrency: string]: string | ExchangeRates;
}

// In-memory cache for exchange rates (valid for 24 hours)
const ratesCache: Map<string, { rates: ExchangeRates; timestamp: number }> = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch exchange rates for a given base currency
 * Results are cached for 24 hours since rates are updated daily
 */
async function fetchExchangeRates(baseCurrency: string): Promise<ExchangeRates> {
  const normalizedBase = baseCurrency.toLowerCase();

  // Check cache first
  const cached = ratesCache.get(normalizedBase);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rates;
  }

  // Fetch from API with fallback
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${normalizedBase}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${normalizedBase}.json`,
  ];

  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 86400 }, // Cache for 24 hours in Next.js
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeAPIResponse = await response.json();
      const rates = data[normalizedBase] as ExchangeRates;

      if (!rates || typeof rates !== 'object') {
        throw new Error('Invalid API response format');
      }

      // Cache the results
      ratesCache.set(normalizedBase, {
        rates,
        timestamp: Date.now(),
      });

      return rates;
    } catch (error) {
      lastError = error as Error;
      continue; // Try next URL
    }
  }

  throw new Error(
    `Failed to fetch exchange rates for ${baseCurrency}: ${lastError?.message}`
  );
}

/** Result type for currency conversion operations */
export interface ConversionResult {
  success: boolean;
  amount: number;
  error?: string;
}

/**
 * Convert an amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code (e.g., 'USD')
 * @param toCurrency - Target currency code (e.g., 'CAD')
 * @returns Converted amount
 * @throws Error if conversion fails
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // If currencies are the same, no conversion needed
  if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
    return amount;
  }

  // Fetch exchange rates with the source currency as base
  const rates = await fetchExchangeRates(fromCurrency);
  const targetRate = rates[toCurrency.toLowerCase()];

  if (typeof targetRate !== 'number') {
    throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
  }

  return amount * targetRate;
}

/**
 * Safely convert currency, returning a result object instead of throwing
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns ConversionResult with success status and converted/original amount
 */
export async function convertCurrencySafe(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  try {
    const converted = await convertCurrency(amount, fromCurrency, toCurrency);
    return { success: true, amount: converted };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown conversion error';
    console.error('Currency conversion error:', message);
    return { success: false, amount, error: message };
  }
}

/**
 * Convert multiple subscriptions to a target currency
 * @param subscriptions - Array of subscriptions with cost and currency
 * @param targetCurrency - User's preferred currency
 * @returns Subscriptions with converted costs
 */
export async function convertSubscriptionsCurrency<T extends { cost: number; currency: string }>(
  subscriptions: T[],
  targetCurrency: string
): Promise<(T & { convertedCost: number; originalCost: number; originalCurrency: string })[]> {
  return Promise.all(
    subscriptions.map(async (subscription) => {
      const convertedCost = await convertCurrency(
        subscription.cost,
        subscription.currency,
        targetCurrency
      );

      return {
        ...subscription,
        convertedCost,
        originalCost: subscription.cost,
        originalCurrency: subscription.currency,
        cost: convertedCost, // Override cost with converted amount
      };
    })
  );
}

/**
 * Calculate total cost in user's preferred currency
 * @param subscriptions - Array of subscriptions
 * @param targetCurrency - User's preferred currency
 * @param frequency - Filter by billing frequency (optional)
 * @returns Total cost in target currency
 */
export async function calculateTotalInCurrency(
  subscriptions: Array<{ cost: number; currency: string; billingFrequency: string }>,
  targetCurrency: string,
  frequency?: string
): Promise<number> {
  let filteredSubscriptions = subscriptions;

  if (frequency) {
    filteredSubscriptions = subscriptions.filter(
      (sub) => sub.billingFrequency.toLowerCase() === frequency.toLowerCase()
    );
  }

  const convertedAmounts = await Promise.all(
    filteredSubscriptions.map((sub) =>
      convertCurrency(sub.cost, sub.currency, targetCurrency)
    )
  );

  return convertedAmounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Normalize cost to monthly equivalent in target currency
 * @param cost - Subscription cost
 * @param currency - Original currency
 * @param billingFrequency - Billing frequency (monthly, yearly, weekly, etc.)
 * @param targetCurrency - Target currency
 * @returns Monthly equivalent cost in target currency
 */
export async function normalizeToMonthlyCost(
  cost: number,
  currency: string,
  billingFrequency: string,
  targetCurrency: string
): Promise<number> {
  const convertedCost = await convertCurrency(cost, currency, targetCurrency);

  switch (billingFrequency.toLowerCase()) {
    case 'monthly':
      return convertedCost;
    case 'yearly':
      return convertedCost / 12;
    case 'weekly':
      return (convertedCost * 52) / 12;
    case 'daily':
      return (convertedCost * 365) / 12;
    case 'quarterly':
      return convertedCost / 3;
    default:
      return convertedCost; // Assume monthly for custom frequencies
  }
}

/**
 * Clear the exchange rates cache (useful for testing)
 */
export function clearRatesCache(): void {
  ratesCache.clear();
}

/**
 * Pre-fetch exchange rates for multiple source currencies
 * This batches the API calls to avoid N+1 queries
 * @param sourceCurrencies - Array of source currency codes
 * @returns Map of source currency to their exchange rates
 */
export async function prefetchExchangeRates(
  sourceCurrencies: string[]
): Promise<Map<string, ExchangeRates>> {
  const uniqueCurrencies = [...new Set(sourceCurrencies.map(c => c.toLowerCase()))];

  const results = await Promise.all(
    uniqueCurrencies.map(async (currency) => {
      try {
        const rates = await fetchExchangeRates(currency);
        return [currency, rates] as const;
      } catch (error) {
        console.error(`Failed to fetch rates for ${currency}:`, error);
        return [currency, null] as const;
      }
    })
  );

  const ratesMap = new Map<string, ExchangeRates>();
  for (const [currency, rates] of results) {
    if (rates) {
      ratesMap.set(currency, rates);
    }
  }

  return ratesMap;
}

/**
 * Convert currency using pre-fetched rates (synchronous lookup)
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param ratesMap - Pre-fetched exchange rates map
 * @returns Converted amount
 * @throws Error if rates not found
 */
export function convertCurrencyWithRates(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesMap: Map<string, ExchangeRates>
): number {
  const from = fromCurrency.toLowerCase();
  const to = toCurrency.toLowerCase();

  if (from === to) {
    return amount;
  }

  const rates = ratesMap.get(from);
  if (!rates) {
    throw new Error(`No exchange rates found for ${fromCurrency}`);
  }

  const targetRate = rates[to];
  if (typeof targetRate !== 'number') {
    throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
  }

  return amount * targetRate;
}

/**
 * Safely convert currency using pre-fetched rates
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param ratesMap - Pre-fetched exchange rates map
 * @returns ConversionResult with success status
 */
export function convertCurrencyWithRatesSafe(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesMap: Map<string, ExchangeRates>
): ConversionResult {
  try {
    const converted = convertCurrencyWithRates(amount, fromCurrency, toCurrency, ratesMap);
    return { success: true, amount: converted };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown conversion error';
    console.error('Currency conversion error:', message);
    return { success: false, amount, error: message };
  }
}

/**
 * Normalize cost to monthly equivalent using pre-fetched rates (synchronous)
 * @param cost - Subscription cost
 * @param currency - Original currency
 * @param billingFrequency - Billing frequency
 * @param targetCurrency - Target currency
 * @param ratesMap - Pre-fetched exchange rates map
 * @returns Monthly equivalent cost in target currency
 */
export function normalizeToMonthlyCostSync(
  cost: number,
  currency: string,
  billingFrequency: string,
  targetCurrency: string,
  ratesMap: Map<string, ExchangeRates>
): number {
  const convertedCost = convertCurrencyWithRates(cost, currency, targetCurrency, ratesMap);

  switch (billingFrequency.toLowerCase()) {
    case 'monthly':
      return convertedCost;
    case 'yearly':
      return convertedCost / 12;
    case 'weekly':
      return (convertedCost * 52) / 12;
    case 'daily':
      return (convertedCost * 365) / 12;
    case 'quarterly':
      return convertedCost / 3;
    default:
      return convertedCost;
  }
}

/**
 * Safely normalize cost to monthly equivalent using pre-fetched rates
 * @param cost - Subscription cost
 * @param currency - Original currency
 * @param billingFrequency - Billing frequency
 * @param targetCurrency - Target currency
 * @param ratesMap - Pre-fetched exchange rates map
 * @returns ConversionResult with monthly equivalent cost
 */
export function normalizeToMonthlyCostSyncSafe(
  cost: number,
  currency: string,
  billingFrequency: string,
  targetCurrency: string,
  ratesMap: Map<string, ExchangeRates>
): ConversionResult {
  try {
    const monthlyAmount = normalizeToMonthlyCostSync(cost, currency, billingFrequency, targetCurrency, ratesMap);
    return { success: true, amount: monthlyAmount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown conversion error';
    console.error('Currency normalization error:', message);
    // Return unconverted monthly equivalent as fallback
    let fallbackAmount = cost;
    switch (billingFrequency.toLowerCase()) {
      case 'yearly': fallbackAmount = cost / 12; break;
      case 'weekly': fallbackAmount = (cost * 52) / 12; break;
      case 'daily': fallbackAmount = (cost * 365) / 12; break;
      case 'quarterly': fallbackAmount = cost / 3; break;
    }
    return { success: false, amount: fallbackAmount, error: message };
  }
}
