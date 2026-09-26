-- ============================================
-- EduPiFlow — PostgreSQL Database Schema
-- ============================================
-- DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
-- PAYMENT POLICY: All payments are settled exclusively in Pi Coin.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PARENTS
CREATE TABLE IF NOT EXISTS parents (
  id VARCHAR(255) PRIMARY KEY,
  pi_username VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  preferred_language VARCHAR(2) DEFAULT 'en',
  preferred_currency VARCHAR(3) DEFAULT 'RWF',
  plan VARCHAR(20) DEFAULT 'FlowBasic',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id VARCHAR(255) REFERENCES parents(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  education_level VARCHAR(20) NOT NULL,
  current_school_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_username VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  official_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) NOT NULL,
  country VARCHAR(2) NOT NULL,
  region VARCHAR(100),
  education_levels JSONB NOT NULL,
  contact_email VARCHAR(255),
  preferred_language VARCHAR(2) DEFAULT 'en',
  academic_calendar JSONB NOT NULL,
  payment_plans JSONB NOT NULL,
  security_deposit_paid BOOLEAN DEFAULT FALSE,
  security_deposit_amount NUMERIC(20,8),
  is_active BOOLEAN DEFAULT FALSE,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  total_enrolled_students INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- LINKS
CREATE TABLE IF NOT EXISTS child_school_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id VARCHAR(255) REFERENCES parents(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  requested_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  linked_by VARCHAR(10) NOT NULL,
  transfer_fee_paid BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(child_id, school_id)
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id VARCHAR(255) REFERENCES parents(id),
  parent_wallet_address VARCHAR(255) NOT NULL,
  school_id UUID REFERENCES schools(id),
  school_wallet_address VARCHAR(255) NOT NULL,
  student_id UUID REFERENCES children(id),
  fee_amount_per_period NUMERIC(20,8) NOT NULL,
  payment_plan VARCHAR(20) NOT NULL,
  parent_security_deposit NUMERIC(20,8) NOT NULL,
  school_security_deposit NUMERIC(20,8) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  grace_window_days INTEGER DEFAULT 7,
  auto_renewal BOOLEAN DEFAULT TRUE,
  renewal_notice_days INTEGER DEFAULT 30,
  force_majeure_clause TEXT,
  deposit_refund_conditions TEXT,
  status VARCHAR(30) NOT NULL,
  signed_by_parent BOOLEAN DEFAULT FALSE,
  signed_by_school BOOLEAN DEFAULT FALSE,
  parent_signed_at TIMESTAMP,
  school_signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(255) PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  parent_id VARCHAR(255) REFERENCES parents(id),
  school_id UUID REFERENCES schools(id),
  student_id UUID REFERENCES children(id),
  amount NUMERIC(20,8) NOT NULL,
  memo VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  txid VARCHAR(255),
  escrow_entered_at TIMESTAMP,
  escrow_release_at TIMESTAMP,
  released_at TIMESTAMP,
  disputed_at TIMESTAMP,
  dispute_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR(255) REFERENCES payments(id),
  total_amount NUMERIC(20,8) NOT NULL,
  school_share NUMERIC(20,8) NOT NULL,
  promoter_share NUMERIC(20,8) NOT NULL,
  scholarship_share NUMERIC(20,8) NOT NULL,
  reserve_share NUMERIC(20,8) NOT NULL,
  school_txid VARCHAR(255),
  promoter_txid VARCHAR(255),
  scholarship_txid VARCHAR(255),
  reserve_txid VARCHAR(255),
  distributed_at TIMESTAMP DEFAULT NOW()
);

-- DEPOSITS
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(10) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  amount NUMERIC(20,8) NOT NULL,
  memo VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL,
  deposited_at TIMESTAMP DEFAULT NOW(),
  frozen_until DATE,
  forfeited_amount NUMERIC(20,8) DEFAULT 0,
  refunded_amount NUMERIC(20,8) DEFAULT 0,
  forfeiture_reason TEXT,
  refund_txid VARCHAR(255)
);

-- SCHOLARSHIPS
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  donor_id VARCHAR(255),
  donor_display_name VARCHAR(255),
  total_amount_pi NUMERIC(20,8) NOT NULL,
  allocated_amount_pi NUMERIC(20,8) DEFAULT 0,
  remaining_amount_pi NUMERIC(20,8) NOT NULL,
  max_recipients INTEGER NOT NULL,
  amount_per_recipient_pi NUMERIC(20,8) NOT NULL,
  eligible_education_levels JSONB,
  eligible_countries JSONB,
  eligible_regions JSONB,
  min_academic_score INTEGER DEFAULT 0,
  max_family_income_level VARCHAR(10) DEFAULT 'any',
  application_open_date DATE,
  application_close_date DATE,
  scholarship_start_date DATE,
  scholarship_end_date DATE,
  status VARCHAR(20) NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE,
  student_id UUID REFERENCES children(id),
  parent_id VARCHAR(255) REFERENCES parents(id),
  school_id UUID REFERENCES schools(id),
  academic_merit_score INTEGER,
  financial_need_score INTEGER,
  regional_alignment_score INTEGER,
  time_on_waitlist_score INTEGER,
  composite_score INTEGER,
  status VARCHAR(20) NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  awarded_at TIMESTAMP,
  waitlist_position INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS scholarship_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id VARCHAR(255) NOT NULL,
  donor_display_name VARCHAR(255),
  amount_pi NUMERIC(20,8) NOT NULL,
  memo VARCHAR(20) NOT NULL,
  txid VARCHAR(255),
  scholarship_id UUID REFERENCES scholarships(id),
  donated_at TIMESTAMP DEFAULT NOW()
);

-- ACADEMIC TOKENS (SBT)
CREATE TABLE IF NOT EXISTS academic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  term VARCHAR(20) NOT NULL,
  education_level VARCHAR(20) NOT NULL,
  results JSONB NOT NULL,
  overall_average NUMERIC(5,2) NOT NULL,
  overall_grade VARCHAR(2) NOT NULL,
  attendance_rate NUMERIC(5,2),
  teacher_comment TEXT,
  is_minor BOOLEAN DEFAULT TRUE,
  custodian_wallet VARCHAR(255),
  cryptographic_signature TEXT,
  txid VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  issued_at TIMESTAMP DEFAULT NOW()
);

-- DISPUTES & TRIBUNAL
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  payment_id VARCHAR(255) REFERENCES payments(id),
  raised_by VARCHAR(10) NOT NULL,
  raised_by_id VARCHAR(255) NOT NULL,
  dispute_type VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  evidence_urls JSONB,
  disputed_amount_pi NUMERIC(20,8) NOT NULL,
  disputed_amount_micro_pi NUMERIC(20,8) NOT NULL,
  status VARCHAR(30) NOT NULL,
  is_auto_mediation BOOLEAN DEFAULT FALSE,
  tribunal_id UUID,
  appeal_tribunal_id UUID,
  verdict TEXT,
  verdict_date TIMESTAMP,
  verdict_executed BOOLEAN DEFAULT FALSE,
  raised_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tribunal_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id),
  level VARCHAR(10) NOT NULL,
  arbitrator_ids JSONB NOT NULL,
  arbitrator_wallets JSONB NOT NULL,
  voting_deadline TIMESTAMP NOT NULL,
  votes_submitted INTEGER DEFAULT 0,
  verdict VARCHAR(20) DEFAULT 'pending',
  verdict_details TEXT,
  majority_count INTEGER,
  minority_count INTEGER,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arbitrators (
  id VARCHAR(255) PRIMARY KEY,
  pi_username VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  is_certified BOOLEAN DEFAULT FALSE,
  has_clean_record BOOLEAN DEFAULT TRUE,
  cases_handled INTEGER DEFAULT 0,
  fee_earned_micro_pi NUMERIC(20,8) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id VARCHAR(255) NOT NULL,
  recipient_role VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'normal',
  channel VARCHAR(20) DEFAULT 'pi_native',
  contract_id UUID,
  payment_id VARCHAR(255),
  dispute_id UUID,
  scholarship_id UUID,
  token_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  is_delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  language VARCHAR(2) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_links_school ON child_school_links(school_id);
CREATE INDEX IF NOT EXISTS idx_links_child ON child_school_links(child_id);
CREATE INDEX IF NOT EXISTS idx_contracts_parent ON contracts(parent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_school ON contracts(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_scholarship_apps_scholarship ON scholarship_applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
