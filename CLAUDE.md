# 하눌안 (Hanulaan) — 장례 영업 관리 앱

## 프로젝트 개요
하늘안추모공원 영업팀을 위한 고객/계약/상품 관리 모바일 웹앱.

## 기술 스택
- **Framework:** Next.js 15 App Router (src/app/)
- **Styling:** Tailwind CSS v4
- **DB / Auth:** Supabase (PostgreSQL + Row Level Security)
- **배포:** Vercel (도메인: hanulaan.vercel.app)
- **알림:** Telegram Bot API

## 환경변수 (.env.local / Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` — 그룹 chat_id (음수값)

## 핵심 파일
| 파일 | 역할 |
|---|---|
| `src/contexts/AuthContext.tsx` | 인증, sessionReady, localStorage 캐시 |
| `src/lib/supabase.ts` | Supabase 싱글톤 클라이언트 |
| `src/lib/telegram.ts` | 텔레그램 알림 함수 모음 |
| `src/lib/types.ts` | 전체 타입 정의 |
| `vercel.json` | Vercel 크론 설정 |

## 페이지 구성
| 경로 | 설명 |
|---|---|
| `/` | 대시보드 (통계, 만료 임박) |
| `/customers` | 고객 목록 (검색/필터/정렬) |
| `/customers/new` | 고객 등록 |
| `/customers/[id]` | 고객 상세 (계약/상품/메모) |
| `/contracts` | 계약 관리 |
| `/products` | 상품 판매 관리 |
| `/dasas` | 답사 관리 |
| `/login` | 로그인 |

## 도메인 / 타입
- 고객 유형: `장례중` `위중` `사전분양` `개장이장`
- 계약 상태: `상담중` `가계약` `계약완료` `취소`
- 상품 유형: `상조연계` `유골함` `개장업`
- 사용자 역할: `admin` `counselor` `sales`

## 주요 규칙
- 가계약 만료일 = 계약일 + 14일 (`addDays()` 헬퍼 사용, UTC 오프셋 주의)
- 모든 데이터 로드 함수: `AbortController` 10초 타임아웃 + `try/catch/finally`
- `sessionReady` 패턴: 캐시된 유저 있으면 즉시 true, 데이터 로드 허용
- Supabase 클라이언트는 반드시 싱글톤 (`src/lib/supabase.ts`) 사용

## 텔레그램 알림 목록
- 신규 고객 등록
- 계약 등록/수정
- 새 메모 (고객/계약 양쪽)
- 가계약 만료 임박 D-1, D-3 (Vercel 크론, 매일 오전 9시 KST)

## Supabase 테이블
`users` `customers` `contracts` `contract_comments` `comments` `sales_products`

## 주의사항
- `addDays()` 는 `toISOString()` 사용 금지 → 로컬 날짜 파트로 계산
- 로딩 무한 스피너 방지: 모든 load 함수에 AbortController 필수
- localStorage 캐시 복원 시 `editingId`/`promotingId` 는 복원 안 함 (무한로딩 원인)
