/**
 * EduPiFlow — Pi Network Configuration
 * Central constants and memo codes for the entire application.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 *
 * PAYMENT POLICY: All payments are settled exclusively in Pi Coin.
 * RWF and USD are used only for display and conversion purposes.
 */

// ============================================
// PI NETWORK SDK
// ============================================
export const PI_SDK_VERSION = '2.0';
export const PI_SANDBOX = true; // Set to false for Mainnet
export const PI_NETWORK = PI_SANDBOX ? 'testnet' : 'mainnet';
export const PI_SCOPES = ['payments', 'wallet_address'];

// ============================================
// GCV STANDARD (Global Consensus Value)
// ============================================
export const GCV_PI_TO_USD = 314159; // 1 Pi = $314,159 USD
export const MICRO_PI_PER_PI = 1000000; // 1 Pi = 1,000,000 μπ
export const MICRO_PI_TO_USD = GCV_PI_TO_USD / MICRO_PI_PER_PI; // $0.314159

// ============================================
// MEMO CODES (Pi transaction identifiers)
// ============================================
export const MEMO_CODES = {
  // Tuition payments
  TUITION_MONTHLY: 'EPF-TUITION-M',
  TUITION_QUARTERLY: 'EPF-TUITION-T',
  TUITION_SEMESTER: 'EPF-TUITION-S',
  TUITION_ANNUAL: 'EPF-TUITION-A',

  // Security deposits
  PARENT_DEPOSIT: 'EPF-CAUTION-P',
  SCHOOL_DEPOSIT: 'EPF-CAUTION-E',

  // Scholarships
  SCHOLARSHIP_DONATION: 'EPF-SCHOLAR-D',
  SCHOLARSHIP_RECEIPT: 'EPF-SCHOLAR-R',
  SCHOLARSHIP_POOL: 'EPF-SCHOLAR-POOL',

  // Platform
  COMMISSION: 'EPF-COMMISSION',
  RESERVE: 'EPF-RESERVE',

  // Academic
  ACADEMIC_TOKEN: 'EPF-TOKEN-AC',

  // Refunds & penalties
  DEPOSIT_REFUND: 'EPF-REFUND-C',
  PENALTY: 'EPF-PENALTY',
  TRANSFER: 'EPF-TRANSFER',
  ARBITRATION: 'EPF-ARBITRATION',
} as const;

export type MemoCode = typeof MEMO_CODES[keyof typeof MEMO_CODES];

// ============================================
// PAYMENT PLANS
// ============================================
export type PaymentPlan = 'monthly' | 'quarterly' | 'semester' | 'annual';

export const PAYMENT_PLAN_MEMO: Record<PaymentPlan, MemoCode> = {
  monthly: MEMO_CODES.TUITION_MONTHLY,
  quarterly: MEMO_CODES.TUITION_QUARTERLY,
  semester: MEMO_CODES.TUITION_SEMESTER,
  annual: MEMO_CODES.TUITION_ANNUAL,
};

export const PAYMENT_PLAN_MONTHS: Record<PaymentPlan, number> = {
  monthly: 1,
  quarterly: 3,
  semester: 6,
  annual: 12,
};

// ============================================
// TRANSACTION DISTRIBUTION (92/5/2/1)
// ============================================
export const DISTRIBUTION = {
  SCHOOL: 0.92,
  PROMOTER: 0.05,
  SCHOLARSHIP_POOL: 0.02,
  RESERVE: 0.01,
} as const;

// ============================================
// TIMING CONSTANTS
// ============================================
export const ESCROW_HOURS = 48;
export const GRACE_PERIOD_DAYS = 7;
export const MAX_ESCROW_DAYS = 14;
export const PENALTY_PER_DAY_MICRO_PI = 0.1;
export const MAX_PENALTY_MICRO_PI = 3.0;
export const OFFLINE_QUEUE_MAX = 3;
export const OFFLINE_QUEUE_EXPIRY_HOURS = 72;

// ============================================
// SECURITY DEPOSIT FORFEITURE SCALES
// ============================================
export const PARENT_FORFEITURE = {
  ONE_DELAY_REGULARIZED: 0.10,
  TWO_DELAYS: 0.25,
  THREE_OR_MORE_DELAYS: 0.50,
  EARLY_TERMINATION_NO_NOTICE: 0.75,
  TOTAL_DEFAULT: 1.00,
} as const;

export const SCHOOL_FORFEITURE = {
  REPORT_CARDS_LATE: 0.10,
  CLOSURE_WITHOUT_NOTICE: 1.00,
  CONFIRMED_FRAUD: 1.00,
  NON_CONFORMING_SERVICE_MIN: 0.25,
  NON_CONFORMING_SERVICE_MAX: 0.50,
} as const;

// ============================================
// LANGUAGES
// ============================================
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'rw', 'sw'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// ============================================
// ACADEMIC CALENDAR
// ============================================
export const ACADEMIC_CALENDAR = {
  DEFAULT_START_MONTH: 9, // September
  DEFAULT_END_MONTH: 6,   // June
} as const;

// ============================================
// CURRENCIES (display only — settlement is always Pi)
// ============================================
export const DISPLAY_CURRENCIES = ['RWF', 'USD', 'Pi'] as const;
export type DisplayCurrency = typeof DISPLAY_CURRENCIES[number];
export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = 'RWF';

// ============================================
// DISCLAIMER
// ============================================
export const DISCLAIMER =
  'This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.';
