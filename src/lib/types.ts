export type UserRole = 'admin' | 'counselor' | 'sales'
export type CustomerType = '장례중' | '위중' | '사전분양' | '개장이장'
export type CustomerStatus = '상담중' | '가계약' | '계약완료' | '취소'
export type ProductType = '상조연계' | '유골함' | '개장업'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  visit_date: string
  customer_type: CustomerType
  is_walking: boolean
  assigned_sales_id?: string
  counselor_id?: string
  has_sangjo?: boolean
  called_us?: boolean
  is_risky: boolean
  risky_note?: string
  pre_sale_type?: '본인' | '가족' | '제3자'
  notes?: string
  status: CustomerStatus
  created_at: string
  assigned_sales?: User
  counselor?: User
}

export interface Dasa {
  id: string
  sales_id?: string
  customer_name: string
  phone?: string
  visit_schedule?: string
  funeral_home?: string
  address?: string
  sangjo?: string
  discount?: string
  special_request?: string
  notes?: string
  created_at: string
  sales?: User
}

export interface Contract {
  id: string
  customer_id: string
  contract_type: '가계약' | '계약완료'
  provisional_date?: string
  expiry_date?: string
  lot_number?: string
  total_amount?: number
  paid_amount: number
  is_completed: boolean
  notes?: string
  created_at: string
  customer?: Customer
}

export interface SalesProduct {
  id: string
  customer_id: string
  product_type: ProductType
  sangjo_company?: string
  amount?: number
  funeral_date?: string
  engraving_info?: string
  relocation_date?: string
  notes?: string
  created_at: string
  customer?: Customer
}
