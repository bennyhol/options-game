/* ============================================
   OptionMaster: Defeat the Algos
   Level Definitions (All 9 Levels)
   Light randomization on prices/strikes
   ============================================ */

// ============ HELPERS ============
function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function roundToStrike(price, interval) {
  return Math.round(price / interval) * interval;
}

// Generate a realistic option chain around a given price
function generateChain(currentPrice, daysToExpiry, iv, strikeInterval) {
  const interval = strikeInterval || 5;
  const atm = roundToStrike(currentPrice, interval);
  const strikes = [];
  for (let i = -4; i <= 4; i++) {
    strikes.push(atm + i * interval);
  }

  return strikes.filter(s => s > 0).map(strike => {
    const moneyness = (currentPrice - strike) / currentPrice;
    const timeValue = Math.sqrt(daysToExpiry / 365) * iv * currentPrice / 100;

    // Call pricing (simplified but realistic-looking)
    const callIntrinsic = Math.max(0, currentPrice - strike);
    const callExtrinsic = timeValue * (1 - Math.abs(moneyness) * 2) + rand(0.1, 0.5);
    const callPremium = Math.max(0.05, Math.round((callIntrinsic + Math.max(0.1, callExtrinsic)) * 100) / 100);

    // Put pricing
    const putIntrinsic = Math.max(0, strike - currentPrice);
    const putExtrinsic = timeValue * (1 - Math.abs(moneyness) * 2) + rand(0.1, 0.5);
    const putPremium = Math.max(0.05, Math.round((putIntrinsic + Math.max(0.1, putExtrinsic)) * 100) / 100);

    // Delta approximation
    const callDelta = Math.max(0.05, Math.min(0.95,
      0.5 + moneyness * 3 + (daysToExpiry > 30 ? 0.05 : -0.05)
    ));
    const putDelta = callDelta - 1;

    // Other greeks
    const gamma = Math.max(0.01, 0.05 * (1 - Math.abs(moneyness) * 4));
    const theta = -(callPremium * (1 / Math.max(1, daysToExpiry)) * (daysToExpiry < 30 ? 2 : 1));
    const vega = timeValue * 0.3;

    const label = strike === atm ? 'ATM' :
      (strike < currentPrice ? 'ITM' : 'OTM'); // For calls

    return {
      strike,
      callPremium: Math.round(callPremium * 100) / 100,
      putPremium: Math.round(putPremium * 100) / 100,
      callMoneyness: label,
      putMoneyness: label === 'ITM' ? 'OTM' : (label === 'OTM' ? 'ITM' : 'ATM'),
      callDelta: Math.round(callDelta * 100) / 100,
      putDelta: Math.round(putDelta * 100) / 100,
      gamma: Math.round(gamma * 1000) / 1000,
      theta: Math.round(theta * 100) / 100,
      vega: Math.round(vega * 100) / 100,
      isATM: strike === atm
    };
  });
}

// ============ LEVEL DEFINITIONS ============

const LEVELS = [

  // ======== LEVEL 1: The Building Blocks ========
  {
    id: 0,
    title: 'The Building Blocks',
    concept: 'Calls, Puts & Moneyness',
    description: 'Learn the basics: buying calls and puts, and what ITM/OTM/ATM mean.',
    maxLegs: 1,
    showGreeks: false,
    hasTimeDecay: false,
    showReminder: true,

    generateScenario() {
      const price = randInt(60, 70);
      return {
        ticker: 'ALGO',
        currentPrice: price,
        daysToExpiry: 30,
        iv: 25,
        chain: generateChain(price, 30, 25, 5),
        direction: 'bullish'
      };
    },

    get steps() {
      return [
        {
          objective: '<strong>The Algo is rising!</strong> Buy an <strong>In-The-Money (ITM) Call</strong> to attack. ' +
            'A Call is ITM when the strike price is <em>below</em> the stock price. ' +
            'Look for intrinsic value!',
          selectMode: 'call_only',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Select exactly one Call option.' };
            const leg = legs[0];
            if (leg.type !== 'call') return { correct: false, feedback: 'You need to buy a CALL (right to buy), not a put!' };
            if (leg.direction !== 'long') return { correct: false, feedback: 'You need to BUY (go long) the call.' };
            if (leg.strike >= scenario.currentPrice) {
              return {
                correct: false,
                feedback: `Strike $${leg.strike} is at or above the stock price of $${scenario.currentPrice}. ` +
                  'That\'s Out-of-the-Money (OTM). For an ITM call, pick a strike BELOW the stock price.'
              };
            }
            const intrinsic = scenario.currentPrice - leg.strike;
            return {
              correct: true,
              feedback: `Correct! Your $${leg.strike} Call is In-The-Money with $${intrinsic.toFixed(2)} of intrinsic value. ` +
                `That means it already has $${(intrinsic * 100).toFixed(0)} of real value per contract!`
            };
          },
          modifyScenario(scenario) {
            scenario.direction = 'bearish';
          }
        },
        {
          objective: '<strong>The Algo crashes!</strong> Now buy a <strong>Put</strong> to defend. ' +
            'A Put gives you the right to SELL at the strike price. ' +
            'Buy an ITM Put (strike ABOVE the stock price).',
          selectMode: 'put_only',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Select exactly one Put option.' };
            const leg = legs[0];
            if (leg.type !== 'put') return { correct: false, feedback: 'You need a PUT this time!' };
            if (leg.direction !== 'long') return { correct: false, feedback: 'You need to BUY the put.' };
            if (leg.strike <= scenario.currentPrice) {
              return {
                correct: false,
                feedback: `Strike $${leg.strike} is at or below the stock price. For an ITM Put, the strike must be ABOVE the current price.`
              };
            }
            return {
              correct: true,
              feedback: `Great defense! Your $${leg.strike} Put is ITM. If the stock keeps falling, your put gains intrinsic value!`,
              explanation: 'You learned the basics: Calls profit when stocks rise, Puts profit when stocks fall. ' +
                'ITM options have intrinsic value. Remember: 1 contract = 100 shares, so every $1 of premium = $100!'
            };
          }
        }
      ];
    },

    explanation: 'Calls = right to BUY at the strike. Puts = right to SELL at the strike. ' +
      'ITM means the option already has intrinsic value. 1 contract always controls 100 shares.'
  },

  // ======== LEVEL 2: The Melting Ice Cube ========
  {
    id: 1,
    title: 'The Melting Ice Cube',
    concept: 'Theta & Time Decay',
    description: 'Options are depreciating assets. Learn how time decay eats your premium.',
    maxLegs: 1,
    showGreeks: ['theta'],
    hasTimeDecay: true,
    showReminder: true,

    generateScenario() {
      const price = randInt(95, 105);
      const strike = roundToStrike(price + 5, 5);
      const premium = rand(3.0, 4.5);
      return {
        ticker: 'MELT',
        currentPrice: price,
        daysToExpiry: 45,
        maxDays: 45,
        iv: 30,
        chain: generateChain(price, 45, 30, 5),
        activePosition: {
          type: 'call',
          direction: 'long',
          strike: strike,
          premium: premium,
          originalPremium: premium,
          greeks: { delta: 0.35, gamma: 0.03, theta: -0.08, vega: 0.15 }
        },
        soldEarly: false,
        sellPrice: null
      };
    },

    objective: '<strong>You own an OTM Call.</strong> Watch how time decay (Theta) melts your premium! ' +
      'The decay accelerates in the last 30 days. <strong>Sell before it reaches zero!</strong> ' +
      'Tap the option to sell it. The better timing, the more you keep.',

    validate(legs, scenario) {
      // This level uses the time decay mechanic, not leg selection
      // Validation happens via the sell button
      return { correct: false, feedback: 'Use the SELL button on your position when ready.' };
    },

    onExpiration(scenario, state) {
      if (!scenario.soldEarly) {
        state.lastResult = {
          won: false,
          legs: [scenario.activePosition],
          metrics: {
            maxProfit: 0,
            maxLoss: -Math.round(scenario.activePosition.originalPremium * 100),
            breakevens: [scenario.activePosition.strike + scenario.activePosition.originalPremium]
          },
          feedback: 'Your option expired worthless! All extrinsic value was consumed by time decay.',
          explanation: 'OTM options are 100% extrinsic value. Theta eats away this value every day, ' +
            'and the decay ACCELERATES in the last 30-45 days. As a buyer, time is your enemy!'
        };
        completeLevel(1, false);
        navigate('results');
      }
    },

    explanation: 'Time decay (Theta) is not linear - it accelerates exponentially as expiration approaches. ' +
      'OTM options lose value fastest because they are entirely extrinsic value.'
  },

  // ======== LEVEL 3: The Greek Dashboard ========
  {
    id: 2,
    title: 'The Greek Dashboard',
    concept: 'Delta, Gamma, Theta, Vega',
    description: 'Master the four risk gauges that every options trader needs.',
    maxLegs: 1,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: true,

    generateScenario() {
      const price = randInt(145, 155);
      return {
        ticker: 'GREK',
        currentPrice: price,
        daysToExpiry: 30,
        iv: 28,
        chain: generateChain(price, 30, 28, 5),
        quizStep: 0,
        quizAnswers: []
      };
    },

    get steps() {
      return [
        {
          objective: '<strong>Delta = Speed.</strong> It tells you how much the option price changes per $1 stock move. ' +
            'A 0.30 Delta also means ~30% chance of expiring ITM. ' +
            '<strong>Buy the Call with Delta closest to 0.50 (the ATM option).</strong>',
          selectMode: 'call_only',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Select one Call.' };
            if (legs[0].type !== 'call') return { correct: false, feedback: 'Select a Call, not a Put.' };
            const chainRow = scenario.chain.find(r => r.strike === legs[0].strike);
            if (!chainRow) return { correct: false, feedback: 'Invalid selection.' };
            if (chainRow.isATM || Math.abs(chainRow.callDelta - 0.5) < 0.15) {
              return {
                correct: true,
                feedback: `Delta = ${chainRow.callDelta}. For every $1 the stock rises, your option gains ~$${chainRow.callDelta.toFixed(2)}. ` +
                  `That's $${(chainRow.callDelta * 100).toFixed(0)} per contract!`
              };
            }
            return {
              correct: false,
              feedback: `Delta ${chainRow.callDelta} is too far from 0.50. The ATM option has the closest Delta to 0.50. Look for the strike nearest the stock price.`
            };
          }
        },
        {
          objective: '<strong>Now observe all four Greeks:</strong> ' +
            'Delta (speed), Gamma (acceleration), Theta (daily decay), Vega (volatility sensitivity). ' +
            '<strong>Buy an OTM Put with Delta between -0.20 and -0.40</strong> - a common hedge.',
          selectMode: 'put_only',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Select one Put.' };
            if (legs[0].type !== 'put') return { correct: false, feedback: 'Select a Put!' };
            const chainRow = scenario.chain.find(r => r.strike === legs[0].strike);
            if (!chainRow) return { correct: false, feedback: 'Invalid selection.' };
            const absDelta = Math.abs(chainRow.putDelta);
            if (absDelta >= 0.15 && absDelta <= 0.45 && legs[0].strike < scenario.currentPrice) {
              return {
                correct: true,
                feedback: `Your OTM Put has Delta ${chainRow.putDelta.toFixed(2)}, ` +
                  `Gamma ${chainRow.gamma.toFixed(3)}, Theta ${chainRow.theta.toFixed(2)}/day, ` +
                  `Vega ${chainRow.vega.toFixed(2)}. You now understand the control panel!`,
                explanation: 'The Greeks are your trading dashboard:\n' +
                  'Delta = expected price change per $1 stock move\n' +
                  'Gamma = how fast Delta changes (acceleration)\n' +
                  'Theta = daily premium erosion (the fuel leak)\n' +
                  'Vega = sensitivity to volatility changes'
              };
            }
            if (legs[0].strike >= scenario.currentPrice) {
              return { correct: false, feedback: 'That Put is ITM. Pick an OTM Put (strike below stock price).' };
            }
            return { correct: false, feedback: `Delta ${chainRow.putDelta.toFixed(2)} is outside the -0.20 to -0.40 range. Try a different strike.` };
          }
        }
      ];
    },

    explanation: 'Delta (speed), Gamma (acceleration), Theta (time decay), and Vega (volatility) ' +
      'are the four essential risk measurements for options traders.'
  },

  // ======== LEVEL 4: Be The Casino (Wheel Strategy) ========
  {
    id: 3,
    title: 'Be The Casino',
    concept: 'The Wheel Strategy',
    description: 'Generate income by selling options. Cash-Secured Put → Covered Call.',
    maxLegs: 1,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: false,

    rollOptions: [
      {
        name: 'Roll Down & Out',
        description: 'Move strike down $5, extend 30 days. Collect more premium.',
        cost: -50, // negative = credit
        result: 'Position rolled to lower strike with more time. Collected $50 credit.',
        apply(scenario, legs) {
          scenario.daysToExpiry += 30;
          if (scenario.activePosition) {
            scenario.activePosition.strike -= 5;
          }
        }
      }
    ],

    generateScenario() {
      const price = randInt(48, 52);
      return {
        ticker: 'WHEEL',
        currentPrice: price,
        daysToExpiry: 30,
        iv: 25,
        chain: generateChain(price, 30, 25, 2.5),
        owns100Shares: false,
        assignedPrice: null,
        wheelStep: 'csp' // csp → assigned → cc
      };
    },

    get steps() {
      return [
        {
          objective: '<strong>Step 1: Cash-Secured Put.</strong> You want to own WHEEL stock at a discount. ' +
            '<strong>SELL a Put at a strike near 0.30 Delta</strong> (below the stock price). ' +
            'You collect premium and agree to buy 100 shares if assigned.',
          selectMode: 'put_only',
          direction: 'short',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Sell one Put.' };
            if (legs[0].type !== 'put') return { correct: false, feedback: 'Sell a PUT, not a call.' };
            if (legs[0].direction !== 'short') return { correct: false, feedback: 'You need to SELL (short) the put to collect premium.' };
            if (legs[0].strike >= scenario.currentPrice) {
              return { correct: false, feedback: 'Sell an OTM put (strike BELOW stock price) to get paid to wait for a lower entry.' };
            }
            const row = scenario.chain.find(r => r.strike === legs[0].strike);
            if (row && Math.abs(row.putDelta) <= 0.45) {
              scenario.assignedPrice = legs[0].strike;
              return {
                correct: true,
                feedback: `You sold the $${legs[0].strike} Put for $${legs[0].premium}/contract ($${(legs[0].premium * 100).toFixed(0)} credit). ` +
                  `If WHEEL drops below $${legs[0].strike}, you'll buy 100 shares. The stock dropped - you're assigned!`
              };
            }
            return { correct: false, feedback: 'Pick a put with Delta closer to 0.30 (further OTM).' };
          },
          modifyScenario(scenario) {
            scenario.owns100Shares = true;
            scenario.currentPrice = scenario.assignedPrice - randInt(1, 3);
            scenario.chain = generateChain(scenario.currentPrice, 30, 25, 2.5);
            scenario.wheelStep = 'cc';
          }
        },
        {
          objective: '<strong>Step 2: Covered Call.</strong> You now own 100 shares (assigned from the put). ' +
            '<strong>SELL an OTM Call</strong> against your shares to collect more premium. ' +
            'If the stock rises above your strike, shares get called away for profit!',
          selectMode: 'call_only',
          direction: 'short',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Sell one Call.' };
            if (legs[0].type !== 'call') return { correct: false, feedback: 'Sell a CALL against your shares.' };
            if (legs[0].direction !== 'short') return { correct: false, feedback: 'SELL the call to collect premium.' };
            if (legs[0].strike <= scenario.currentPrice) {
              return { correct: false, feedback: 'Sell an OTM call (strike ABOVE stock price).' };
            }
            return {
              correct: true,
              feedback: `You sold the $${legs[0].strike} Call for $${legs[0].premium}/contract. ` +
                `You collect premium while waiting. If stock rises above $${legs[0].strike}, shares are called away at a profit. ` +
                `The Wheel is complete! Rinse and repeat.`,
              explanation: 'The Wheel Strategy: 1) Sell Cash-Secured Put → collect premium. ' +
                '2) If assigned, you own shares at a discount. 3) Sell Covered Calls on those shares → collect more premium. ' +
                '4) If called away, start over. You profit from premium collection at every step!'
            };
          }
        }
      ];
    },

    explanation: 'The Wheel: Sell puts to get paid to buy stock, then sell calls to get paid to sell stock. Repeat!'
  },

  // ======== LEVEL 5: The Shield Generator ========
  {
    id: 4,
    title: 'The Shield Generator',
    concept: 'Protective Puts & Collars',
    description: 'Hedge your stock positions against crashes with puts and collars.',
    maxLegs: 2,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: false,

    generateScenario() {
      const price = randInt(195, 205);
      return {
        ticker: 'SHIELD',
        currentPrice: price,
        daysToExpiry: 30,
        iv: 35,
        chain: generateChain(price, 30, 35, 5),
        owns100Shares: true,
        earningsIn: '5 days'
      };
    },

    get steps() {
      return [
        {
          objective: '<strong>Earnings in 5 days!</strong> You own 100 shares of SHIELD at $' +
            '200. <strong>Buy a Protective Put</strong> to limit your downside. ' +
            'Pick a Put with a strike near or slightly below the current price.',
          selectMode: 'put_only',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Buy one Put for protection.' };
            if (legs[0].type !== 'put') return { correct: false, feedback: 'Buy a PUT for downside protection.' };
            if (legs[0].direction !== 'long') return { correct: false, feedback: 'BUY the put (go long).' };
            if (legs[0].strike > scenario.currentPrice + 5) {
              return { correct: false, feedback: 'That put is very deep ITM and expensive. Pick a strike closer to or below the stock price.' };
            }
            return {
              correct: true,
              feedback: `Married Put placed! Your downside is now limited to $${legs[0].strike}. ` +
                `But the protection cost you $${(legs[0].premium * 100).toFixed(0)}. That's expensive! ` +
                `Let's build a Collar to reduce the cost.`
            };
          },
          modifyScenario(scenario) {
            // Keep same scenario for collar
          }
        },
        {
          objective: '<strong>The Collar.</strong> The put was expensive! Now <strong>sell an OTM Call</strong> ' +
            'to finance the put\'s cost, AND <strong>buy a Put</strong> for protection. ' +
            'Build both legs: Long Put + Short Call.',
          selectMode: 'both',
          direction: null,
          validate(legs, scenario) {
            if (legs.length !== 2) return { correct: false, feedback: 'A Collar needs 2 legs: Long Put + Short Call.' };
            const put = legs.find(l => l.type === 'put');
            const call = legs.find(l => l.type === 'call');
            if (!put || !call) return { correct: false, feedback: 'Need one Put AND one Call.' };
            if (put.direction !== 'long') return { correct: false, feedback: 'BUY the Put (go long) for protection.' };
            if (call.direction !== 'short') return { correct: false, feedback: 'SELL the Call (go short) to collect premium.' };
            if (put.strike >= scenario.currentPrice) {
              return { correct: false, feedback: 'Put strike should be below stock price (OTM put) for cheaper protection.' };
            }
            if (call.strike <= scenario.currentPrice) {
              return { correct: false, feedback: 'Call strike should be above stock price (OTM call) to give room for upside.' };
            }
            const netCost = put.premium - call.premium;
            return {
              correct: true,
              feedback: `Collar complete! Net cost: $${(netCost * 100).toFixed(0)} ` +
                `(vs $${(put.premium * 100).toFixed(0)} for the put alone). ` +
                `Protected below $${put.strike}, capped above $${call.strike}.`,
              explanation: 'A Collar = Long Stock + Long Put + Short Call. The call premium offsets the put cost. ' +
                'Trade-off: you limit upside to finance downside protection. Perfect before earnings or uncertain events!'
            };
          }
        }
      ];
    },

    explanation: 'Protective Puts insure your shares. Collars reduce insurance cost by selling upside via a call.'
  },

  // ======== LEVEL 6: Vertical Spreads ========
  {
    id: 5,
    title: 'Vertical Spreads',
    concept: 'Debit & Credit Spreads',
    description: 'Multi-leg trades to reduce cost and define your risk.',
    maxLegs: 2,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: false,

    rollOptions: [
      {
        name: 'Roll Down',
        description: 'Move both strikes down $5, same expiry.',
        cost: 25,
        result: 'Spread rolled down $5. Paid $25 debit.',
        apply(scenario, legs) {
          legs.forEach(l => l.strike -= 5);
        }
      },
      {
        name: 'Roll Out',
        description: 'Extend expiry 30 days, same strikes.',
        cost: -30,
        result: 'Spread rolled out 30 days. Collected $30 credit.',
        apply(scenario, legs) {
          scenario.daysToExpiry += 30;
        }
      }
    ],

    generateScenario() {
      const price = randInt(170, 180);
      return {
        ticker: 'VERT',
        currentPrice: price,
        daysToExpiry: 45,
        iv: 22,
        chain: generateChain(price, 45, 22, 5)
      };
    },

    get steps() {
      return [
        {
          objective: '<strong>Bull Call Spread (Debit).</strong> You\'re bullish on VERT but want to cap your risk. ' +
            '<strong>Buy a lower-strike Call AND sell a higher-strike Call</strong> at the same expiration. ' +
            'You pay a net debit but your max loss is limited to that debit.',
          selectMode: 'call_only',
          direction: null,
          validate(legs, scenario) {
            if (legs.length !== 2) return { correct: false, feedback: 'Need exactly 2 Call legs for a vertical spread.' };
            if (!legs.every(l => l.type === 'call')) return { correct: false, feedback: 'Both legs should be Calls.' };

            const longLeg = legs.find(l => l.direction === 'long');
            const shortLeg = legs.find(l => l.direction === 'short');
            if (!longLeg || !shortLeg) return { correct: false, feedback: 'Need one LONG Call and one SHORT Call.' };

            if (longLeg.strike >= shortLeg.strike) {
              return { correct: false, feedback: 'For a Bull Call Spread: buy the LOWER strike, sell the HIGHER strike.' };
            }

            const debit = longLeg.premium - shortLeg.premium;
            const maxProfit = (shortLeg.strike - longLeg.strike) - debit;
            return {
              correct: true,
              feedback: `Bull Call Spread: Net debit $${(debit * 100).toFixed(0)}. ` +
                `Max profit $${(maxProfit * 100).toFixed(0)} if VERT above $${shortLeg.strike} at expiry. ` +
                `Max loss = your debit of $${(debit * 100).toFixed(0)}. Risk defined!`
            };
          },
          modifyScenario(scenario) {
            scenario.currentPrice = scenario.currentPrice - randInt(3, 8);
            scenario.chain = generateChain(scenario.currentPrice, 45, 22, 5);
          }
        },
        {
          objective: '<strong>Bear Call Spread (Credit).</strong> Now VERT looks bearish. ' +
            '<strong>Sell a lower-strike Call AND buy a higher-strike Call.</strong> ' +
            'You collect a net credit upfront. You win if VERT stays below the short strike.',
          selectMode: 'call_only',
          direction: null,
          validate(legs, scenario) {
            if (legs.length !== 2) return { correct: false, feedback: 'Need exactly 2 Call legs.' };
            if (!legs.every(l => l.type === 'call')) return { correct: false, feedback: 'Both legs should be Calls.' };

            const longLeg = legs.find(l => l.direction === 'long');
            const shortLeg = legs.find(l => l.direction === 'short');
            if (!longLeg || !shortLeg) return { correct: false, feedback: 'Need one SHORT Call (sell) and one LONG Call (buy for protection).' };

            if (shortLeg.strike >= longLeg.strike) {
              return { correct: false, feedback: 'For a Bear Call Spread: sell the LOWER strike, buy the HIGHER strike as protection.' };
            }

            const credit = shortLeg.premium - longLeg.premium;
            const maxLoss = (longLeg.strike - shortLeg.strike) - credit;
            return {
              correct: true,
              feedback: `Bear Call Spread: Net credit $${(credit * 100).toFixed(0)}. ` +
                `Max profit = credit if VERT stays below $${shortLeg.strike}. ` +
                `Max loss $${(maxLoss * 100).toFixed(0)}. Defined risk on both sides!`,
              explanation: 'Vertical Spreads let you trade direction with defined risk. ' +
                'Debit spreads (Bull Call, Bear Put) pay upfront for potential profit. ' +
                'Credit spreads (Bear Call, Bull Put) collect premium and profit from time decay.'
            };
          }
        }
      ];
    },

    explanation: 'Vertical spreads: buy one option, sell another at different strike, same expiry. Defined risk & reward.'
  },

  // ======== LEVEL 7: Volatility Storms ========
  {
    id: 6,
    title: 'Volatility Storms',
    concept: 'Straddles & Strangles',
    description: 'Bet on explosive stock movement regardless of direction.',
    maxLegs: 2,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: false,

    generateScenario() {
      const price = randInt(98, 102);
      return {
        ticker: 'STORM',
        currentPrice: price,
        daysToExpiry: 14,
        iv: 55,
        chain: generateChain(price, 14, 55, 5),
        event: 'Earnings Report tomorrow!'
      };
    },

    get steps() {
      return [
        {
          objective: '<strong>Earnings tomorrow - direction unknown!</strong> Build a <strong>Long Straddle</strong>: ' +
            'buy a Call AND a Put at the <strong>same ATM strike</strong>. ' +
            'You profit if the stock moves big in either direction.',
          selectMode: 'both',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 2) return { correct: false, feedback: 'A Straddle needs 2 legs: one Call + one Put.' };
            const call = legs.find(l => l.type === 'call');
            const put = legs.find(l => l.type === 'put');
            if (!call || !put) return { correct: false, feedback: 'Need one Call AND one Put.' };
            if (call.direction !== 'long' || put.direction !== 'long') {
              return { correct: false, feedback: 'BUY both legs (long straddle).' };
            }
            if (call.strike !== put.strike) {
              return { correct: false, feedback: `Both legs must be at the SAME strike for a Straddle. You have Call $${call.strike} and Put $${put.strike}.` };
            }
            const totalCost = call.premium + put.premium;
            return {
              correct: true,
              feedback: `Straddle built at $${call.strike}! Total cost: $${(totalCost * 100).toFixed(0)}. ` +
                `Stock needs to move more than $${totalCost.toFixed(2)} in either direction to profit. That's a big breakeven!`
            };
          },
          modifyScenario(scenario) {
            // Widen the chain strikes for strangle
          }
        },
        {
          objective: '<strong>The Straddle is expensive!</strong> Build a cheaper <strong>Long Strangle</strong>: ' +
            'buy an OTM Call (above stock price) AND an OTM Put (below stock price). ' +
            'Different strikes = lower cost, but needs even bigger movement.',
          selectMode: 'both',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 2) return { correct: false, feedback: 'Need 2 legs: OTM Call + OTM Put.' };
            const call = legs.find(l => l.type === 'call');
            const put = legs.find(l => l.type === 'put');
            if (!call || !put) return { correct: false, feedback: 'Need one Call AND one Put.' };
            if (call.direction !== 'long' || put.direction !== 'long') {
              return { correct: false, feedback: 'BUY both legs.' };
            }
            if (call.strike === put.strike) {
              return { correct: false, feedback: 'For a Strangle, use DIFFERENT strikes. The Call strike should be above and Put strike below the stock price.' };
            }
            if (call.strike <= scenario.currentPrice) {
              return { correct: false, feedback: 'The Call should be OTM (strike above stock price).' };
            }
            if (put.strike >= scenario.currentPrice) {
              return { correct: false, feedback: 'The Put should be OTM (strike below stock price).' };
            }
            const totalCost = call.premium + put.premium;
            return {
              correct: true,
              feedback: `Strangle built! Cost: $${(totalCost * 100).toFixed(0)} - cheaper than the straddle! ` +
                `But the stock needs to move past $${call.strike} or below $${put.strike} to profit.`,
              explanation: 'Straddles: same strike, expensive, smaller breakeven. ' +
                'Strangles: different OTM strikes, cheaper, wider breakeven. ' +
                'Both profit from big moves regardless of direction. High IV = more expensive!'
            };
          }
        }
      ];
    },

    explanation: 'Straddles and strangles are volatility plays. You profit from big moves, lose from small moves.'
  },

  // ======== LEVEL 8: The Sideways Matrix ========
  {
    id: 7,
    title: 'The Sideways Matrix',
    concept: 'Iron Condors',
    description: 'Profit from a stock that goes absolutely nowhere.',
    maxLegs: 4,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: false,

    rollOptions: [
      {
        name: 'Roll Tested Side',
        description: 'Close and re-sell the threatened spread further out.',
        cost: -20,
        result: 'Threatened side rolled out. Collected $20 additional credit.',
        apply(scenario, legs) {
          scenario.daysToExpiry += 14;
        }
      }
    ],

    generateScenario() {
      const price = randInt(248, 252);
      return {
        ticker: 'FLAT',
        currentPrice: price,
        daysToExpiry: 30,
        iv: 18,
        chain: generateChain(price, 30, 18, 5)
      };
    },

    objective: '<strong>The market is flat.</strong> Build an <strong>Iron Condor</strong> to profit from sideways movement. ' +
      'Combine 4 legs: <strong>Sell an OTM Put + Buy a lower Put (Bull Put Spread)</strong> AND ' +
      '<strong>Sell an OTM Call + Buy a higher Call (Bear Call Spread)</strong>. ' +
      'You win if FLAT stays between the two short strikes!',

    validate(legs, scenario) {
      if (legs.length !== 4) return { correct: false, feedback: 'An Iron Condor needs exactly 4 legs: 2 Puts + 2 Calls.' };

      const calls = legs.filter(l => l.type === 'call');
      const puts = legs.filter(l => l.type === 'put');

      if (calls.length !== 2 || puts.length !== 2) {
        return { correct: false, feedback: 'Need 2 Calls and 2 Puts.' };
      }

      const shortPut = puts.find(p => p.direction === 'short');
      const longPut = puts.find(p => p.direction === 'long');
      const shortCall = calls.find(c => c.direction === 'short');
      const longCall = calls.find(c => c.direction === 'long');

      if (!shortPut || !longPut || !shortCall || !longCall) {
        return { correct: false, feedback: 'Need: Short Put + Long Put (lower) + Short Call + Long Call (higher).' };
      }

      if (longPut.strike >= shortPut.strike) {
        return { correct: false, feedback: 'Long Put must be at a LOWER strike than Short Put (bull put spread).' };
      }

      if (longCall.strike <= shortCall.strike) {
        return { correct: false, feedback: 'Long Call must be at a HIGHER strike than Short Call (bear call spread).' };
      }

      if (shortPut.strike >= scenario.currentPrice) {
        return { correct: false, feedback: 'Short Put should be BELOW stock price (OTM).' };
      }

      if (shortCall.strike <= scenario.currentPrice) {
        return { correct: false, feedback: 'Short Call should be ABOVE stock price (OTM).' };
      }

      const credit = (shortPut.premium + shortCall.premium) - (longPut.premium + longCall.premium);
      return {
        correct: true,
        feedback: `Iron Condor complete! Net credit: $${(credit * 100).toFixed(0)}. ` +
          `Win zone: $${shortPut.strike} to $${shortCall.strike}. ` +
          `Max profit if FLAT stays in this range at expiry. You are the house!`,
        explanation: 'An Iron Condor = Bear Call Spread + Bull Put Spread. You collect premium from both sides. ' +
          'Max profit when price stays between short strikes. Risk is limited by the long wings. ' +
          'This is a defined-risk, high-probability strategy for sideways markets.'
      };
    },

    explanation: 'Iron Condors profit from low volatility. Sell premium on both sides, win if stock stays in a range.'
  },

  // ======== LEVEL 9: The Power Up (LEAPS & PMCC) ========
  {
    id: 8,
    title: 'The Power Up',
    concept: 'LEAPS & Poor Man\'s Covered Call',
    description: 'Use leverage wisely with long-term options.',
    maxLegs: 2,
    showGreeks: true,
    hasTimeDecay: false,
    showReminder: false,

    generateScenario() {
      const price = randInt(395, 405);
      return {
        ticker: 'POWER',
        currentPrice: price,
        daysToExpiry: 365,
        shortExpiry: 30,
        iv: 25,
        chain: generateChain(price, 365, 25, 10),
        shortChain: generateChain(price, 30, 25, 5),
        fullShareCost: price * 100
      };
    },

    get steps() {
      return [
        {
          objective: `<strong>100 shares costs ~$40,000!</strong> You only have $10,000. ` +
            `<strong>Buy a deep ITM LEAPS Call</strong> (1+ year expiry) with Delta ~0.70+. ` +
            `This simulates owning shares at a fraction of the cost!`,
          selectMode: 'call_only',
          direction: 'long',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Buy one deep ITM LEAPS Call.' };
            if (legs[0].type !== 'call') return { correct: false, feedback: 'Buy a CALL.' };
            if (legs[0].direction !== 'long') return { correct: false, feedback: 'BUY (go long) the LEAPS.' };

            const row = scenario.chain.find(r => r.strike === legs[0].strike);
            if (!row) return { correct: false, feedback: 'Invalid selection.' };

            if (legs[0].strike >= scenario.currentPrice - 20) {
              return { correct: false, feedback: 'Go deeper ITM! Pick a strike well below the stock price for higher Delta (0.70+).' };
            }

            if (row.callDelta < 0.6) {
              return { correct: false, feedback: `Delta ${row.callDelta.toFixed(2)} is too low. You need 0.70+ Delta to simulate share ownership.` };
            }

            const cost = legs[0].premium * 100;
            return {
              correct: true,
              feedback: `LEAPS bought for $${cost.toFixed(0)} vs $${scenario.fullShareCost.toFixed(0)} for 100 shares! ` +
                `Delta ${row.callDelta.toFixed(2)} means it moves ~${(row.callDelta * 100).toFixed(0)}% like the stock. ` +
                `Now let's generate income from it!`
            };
          },
          modifyScenario(scenario) {
            // Switch to short-term chain for selling calls
            scenario.chain = scenario.shortChain;
            scenario.daysToExpiry = 30;
          }
        },
        {
          objective: '<strong>Poor Man\'s Covered Call.</strong> You own the LEAPS. Now <strong>sell a short-term OTM Call</strong> ' +
            'against it (30 days out). Collect weekly/monthly income just like a covered call, but with less capital!',
          selectMode: 'call_only',
          direction: 'short',
          validate(legs, scenario) {
            if (legs.length !== 1) return { correct: false, feedback: 'Sell one short-term OTM Call.' };
            if (legs[0].type !== 'call') return { correct: false, feedback: 'Sell a CALL.' };
            if (legs[0].direction !== 'short') return { correct: false, feedback: 'SELL (go short) the call to collect premium.' };
            if (legs[0].strike <= scenario.currentPrice) {
              return { correct: false, feedback: 'Sell an OTM call (strike ABOVE stock price) to give room for profit.' };
            }

            return {
              correct: true,
              feedback: `PMCC complete! You sold the $${legs[0].strike} Call for $${(legs[0].premium * 100).toFixed(0)}. ` +
                `This income reduces your LEAPS cost. When this call expires, sell another one next month!`,
              explanation: 'The Poor Man\'s Covered Call (PMCC) = Long LEAPS Call + Short-term Short Call. ' +
                'You simulate a Covered Call strategy using a fraction of the capital. ' +
                'The LEAPS acts as your "stock" position. Sell monthly calls to generate recurring income. ' +
                'Congratulations - you\'ve mastered all 9 levels!'
            };
          }
        }
      ];
    },

    explanation: 'LEAPS + short calls = Poor Man\'s Covered Call. Leverage without full capital commitment.'
  }
];

// ============ LEVEL ACCESS ============
function getLevelDef(index) {
  return LEVELS[index] || null;
}

function getLevelCount() {
  return LEVELS.length;
}
