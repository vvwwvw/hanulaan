-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'counselor', 'sales')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 방문고객 테이블
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  customer_type TEXT NOT NULL CHECK (customer_type IN ('장례중', '위중', '사전분양', '개장이장')),
  is_walking BOOLEAN DEFAULT true,
  assigned_sales_id UUID REFERENCES users(id),
  counselor_id UUID REFERENCES users(id),
  has_sangjo BOOLEAN,
  called_us BOOLEAN,
  is_risky BOOLEAN DEFAULT false,
  risky_note TEXT,
  pre_sale_type TEXT CHECK (pre_sale_type IN ('본인', '가족', '제3자')),
  notes TEXT,
  status TEXT DEFAULT '상담중' CHECK (status IN ('상담중', '가계약', '계약완료', '취소')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 답사자 현황 테이블 (영업자 등록)
CREATE TABLE dasas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id UUID REFERENCES users(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  visit_schedule TIMESTAMPTZ,
  funeral_home TEXT,
  address TEXT,
  sangjo TEXT,
  discount TEXT,
  special_request TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가계약/계약 테이블
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('가계약', '계약완료')),
  provisional_date DATE,
  expiry_date DATE,
  lot_number TEXT,
  total_amount BIGINT,
  paid_amount BIGINT DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 상품 판매 테이블
CREATE TABLE sales_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('상조연계', '유골함', '개장업')),
  sangjo_company TEXT,
  amount BIGINT,
  funeral_date TIMESTAMPTZ,
  engraving_info TEXT,
  relocation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 비활성화 (소규모 내부용)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE dasas DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_products DISABLE ROW LEVEL SECURITY;
