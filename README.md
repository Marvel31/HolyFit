# 🏋️ HolyFit (그룹 운동 인증 & 주간 정산 웹앱)

> **"매일 운동을 사진으로 인증하고, 주 3회 목표를 달성하세요!"**  
> 미달 시 가벼운 벌금(200원)과 초과 달성 시 보너스 포인트(+1P)로 동기부여를 극대화하는 모바일 퍼스트 반응형 PWA 웹애플리케이션입니다.

---

## ✨ 주요 기능 (Key Features)

1. **📱 모바일 퍼스트 반응형 & PWA 지원**
   - iOS Safari 및 Android Chrome '홈 화면에 추가(PWA)' 지원
   - 상단 설치 안내 배너 및 iPhone 맞춤형 가이드 제공
   - 노치 및 하단 Safe Area Inset 완벽 대응 모바일 UI (최대 430px 앱 뷰)
2. **🔐 간편 소셜 로그인 & 그룹 관리**
   - Supabase Auth 기반 카카오/구글 로그인 & 게스트 체험 모드 지원
   - 최초 온보딩 시 닉네임 및 프로필 아바타 설정
   - 다중 그룹 생성, 6자리 고유 초대 코드로 즉시 참여 및 그룹 전환 드롭다운
3. **📸 일일 사진 운동 인증 파이프라인 (1일 1회)**
   - 카메라 즉시 촬영 및 갤러리 업로드 지원
   - `browser-image-compression` 기반 클라이언트 WebP 자동 압축
   - 운동 부위/종류 태그(헬스, 러닝, 필라테스 등) 및 한 줄 소감 메모
   - 동일 일자(00:00~23:59) 중복 제출 방지 (클라이언트 & DB 복합 제약)
4. **⚖️ 주간 정산 룰 엔진 (벌금 200원 & 보너스 포인트)**
   - 정산 주기: **매주 월요일 00:00 ~ 일요일 23:59 (ISO-8601 Week)**
   - **기본 목표**: 주 3회 인증 (그룹별 설정 가능)
   - **미달 시**: 주 0~2회 달성 시 **벌금 200원** 부과
   - **초과 달성 시**: 주 4회 이상부터 **초과 1회당 +1 보너스 포인트 적립**
     - 주 4회: +1P / 주 5회: +2P / 주 6회: +3P / 주 7회(올출석): +4P
   - **정산 대시보드 3개 탭**:
     - `이번 주 현황`: 멤버별 실시간 달성률, 안전권(3회 이상) vs 위험권(0~2회) 시각화
     - `지난 주 정산 리포트`: 총 벌금 누적액, 벌금 대상자 명단, 방장 수납 완료 토글, 보너스 획득자 명단
     - `내 포인트 장부`: 현재 보유 총 포인트 및 주차별 적립/변동 히스토리
5. **🧹 7일 사진 보관 및 스토리지 자동 정리**
   - 인증 사진은 업로드 후 정확히 **7일 동안만 보관**
   - 7일 경과 시 Supabase Storage에서 사진 파일 자동 삭제 (`/api/cron/cleanup-expired-photos`)
   - 사진 파일이 정리되어도 **인증 일자, 시각, 운동 종류, 메모 등 텍스트 데이터는 영구 보존**
   - 피드에서 세련된 만료 안내 플레이스홀더 카드 표시

---

## 🛠️ 기술 스택 (Tech Stack)

| 영역 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 15 (App Router)** | React 19, TypeScript, 서버 액션(Server Actions) |
| **Styling** | **Tailwind CSS + CSS 변수** | 모바일 앱 뷰 디자인 시스템, Glassmorphism, 다크모드 대응 |
| **Icons** | **Lucide React** | 직관적이고 미려한 모바일 아이콘 세트 |
| **Backend & DB** | **Supabase (PostgreSQL)** | RLS(Row Level Security) 보안 정책 적용, Storage |
| **Image Compression** | **browser-image-compression** | 클라이언트단 2MB 이하 WebP 압축 |
| **Date & Time** | **date-fns & Custom ISO Util** | 월~일 ISO Week 계산 및 한글 상대시간 포맷팅 |
| **Deployment** | **Vercel** | Edge Network, Vercel Cron 연동 |

---

## 🚀 빠른 시작 가이드 (Getting Started)

### 1. 레포지토리 클론 및 패키지 설치
```bash
git clone https://github.com/your-repo/HolyFit.git
cd HolyFit
npm install
```

### 2. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 Supabase 프로젝트의 API 키를 입력합니다.

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # (스토리지 자동 만료 및 관리자 기능용)
CRON_SECRET=your-secure-random-secret           # (선택: Cron API 보안 인증용)
```

> **참고**: Supabase 환경변수를 입력하지 않아도 개발 및 데모 모드(Guest Mock)로 즉시 UI와 기능을 체험해 볼 수 있습니다.

### 3. PostgreSQL DB 마이그레이션 적용
Supabase Dashboard의 **SQL Editor**에서 아래 파일을 순서대로 실행합니다:
- [`supabase/migrations/001_initial_schema.sql`](file:///c:/repository/HolyFit/supabase/migrations/001_initial_schema.sql)
  - `users`, `groups`, `group_members`, `workout_records`, `weekly_settlements`, `point_histories` 테이블 생성
  - RLS 보안 정책 및 인덱스, `workout-photos` 스토리지 버킷 자동 생성

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 📁 디렉토리 구조 (Project Structure)

```
HolyFit/
├── src/
│   ├── app/
│   │   ├── actions/                  # Server Actions (Auth, Group, Workout, Settlement)
│   │   ├── api/cron/                 # Vercel Cron API (사진 7일 만료 정리)
│   │   ├── dashboard/                # 메인 대시보드 (홈/정산/마이 탭)
│   │   ├── groups/                   # 그룹 생성 및 초대 가입 페이지
│   │   ├── login/                    # 소셜 로그인 & 게스트 로그인
│   │   ├── onboarding/               # 최초 닉네임/프로필 설정
│   │   ├── globals.css               # HolyFit 모바일 디자인 시스템 & CSS 토큰
│   │   └── layout.tsx                # 루트 레이아웃 & PWA 메타태그
│   ├── components/
│   │   ├── home/                     # 주간 진행률 프로그레스 카드
│   │   ├── pwa/                      # PWA 설치 안내 모달 & 배너
│   │   ├── settlement/               # 주간 정산 & 벌금/포인트 대시보드
│   │   └── workout/                  # 사진 인증 모달 & 실시간 피드
│   └── lib/
│       ├── date-utils.ts             # ISO Week 및 주간 날짜 범위 유틸리티
│       └── supabase/                 # Client, Server, Admin 클라이언트 SDK
├── supabase/
│   └── migrations/                   # PostgreSQL 스키마 및 RLS SQL
├── public/                           # PWA 매니페스트, 앱 아이콘 세트
└── TODO.md                           # 마일스톤별 상세 개발 체크리스트
```

---

## ⏰ 정기 작업 (Vercel Cron 설정)

`vercel.json`에 아래와 같이 매일 자정 사진 만료 정리를 스케줄링할 수 있습니다:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-photos",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 📄 라이선스
MIT License
