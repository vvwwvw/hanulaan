import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 모듈 레벨 싱글톤 — 앱 전체에서 단 하나의 인스턴스 사용
export const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 기존 코드 호환성 유지
export function createClient() {
  return supabase
}
