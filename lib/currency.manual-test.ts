// Simple test file for currency conversion
// Run with: npx tsx lib/currency.test.ts

import { convertCurrency, normalizeToMonthlyCost, calculateTotalInCurrency } from './currency';

async function testCurrencyConversion() {
  console.log('Testing Currency Conversion...\n');

  try {
    // Test 1: Convert USD to CAD
    console.log('Test 1: Convert $100 USD to CAD');
    const usdToCad = await convertCurrency(100, 'USD', 'CAD');
    console.log(`Result: ${usdToCad.toFixed(2)} CAD\n`);

    // Test 2: Convert EUR to USD
    console.log('Test 2: Convert €50 EUR to USD');
    const eurToUsd = await convertCurrency(50, 'EUR', 'USD');
    console.log(`Result: $${eurToUsd.toFixed(2)} USD\n`);

    // Test 3: Same currency (should return same amount)
    console.log('Test 3: Convert $75 USD to USD (same currency)');
    const usdToUsd = await convertCurrency(75, 'USD', 'USD');
    console.log(`Result: $${usdToUsd.toFixed(2)} USD\n`);

    // Test 4: Normalize monthly subscription
    console.log('Test 4: Normalize $120/year USD subscription to monthly CAD');
    const yearlyToMonthly = await normalizeToMonthlyCost(120, 'USD', 'yearly', 'CAD');
    console.log(`Result: ${yearlyToMonthly.toFixed(2)} CAD/month\n`);

    // Test 5: Normalize weekly subscription
    console.log('Test 5: Normalize $10/week USD subscription to monthly CAD');
    const weeklyToMonthly = await normalizeToMonthlyCost(10, 'USD', 'weekly', 'CAD');
    console.log(`Result: ${weeklyToMonthly.toFixed(2)} CAD/month\n`);

    // Test 6: Calculate total with multiple subscriptions
    console.log('Test 6: Calculate total of multiple subscriptions in CAD');
    const subscriptions = [
      { cost: 10, currency: 'USD', billingFrequency: 'monthly' },
      { cost: 120, currency: 'EUR', billingFrequency: 'yearly' },
      { cost: 5, currency: 'GBP', billingFrequency: 'weekly' },
    ];
    const total = await calculateTotalInCurrency(subscriptions, 'CAD');
    console.log(`Result: ${total.toFixed(2)} CAD/month\n`);

    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCurrencyConversion();
