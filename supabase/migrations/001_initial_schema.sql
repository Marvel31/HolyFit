-- ============================================================
-- HolyFit: 그룹 운동 인증 웹앱 - DB 마이그레이션 스크립트
-- Supabase PostgreSQL (with RLS)
-- ============================================================

-- 0. UUID 확장 (Supabase에서 기본 활성화됨)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users 테이블 (프로필 정보)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nickname TEXT NOT NULL,
  profile_image TEXT,
  total_bonus_points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.users IS '유저 프로필 정보 (auth.users와 1:1 연결)';
COMMENT ON COLUMN public.users.total_bonus_points IS '현재 보유 보너스 포인트 (기본 0)';

-- ============================================================
-- 2. groups 테이블 (운동 그룹)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  weekly_target_count INTEGER DEFAULT 3 NOT NULL,
  penalty_amount INTEGER DEFAULT 200 NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.groups IS '운동 그룹 (방장이 생성, 초대 코드로 참여)';
COMMENT ON COLUMN public.groups.weekly_target_count IS '주간 목표 인증 횟수 (기본 3회)';
COMMENT ON COLUMN public.groups.penalty_amount IS '미달 시 벌금 (기본 200원)';
COMMENT ON COLUMN public.groups.invite_code IS '6~8자리 랜덤 고유 초대 코드';

-- ============================================================
-- 3. group_members 테이블 (그룹 멤버십)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER' NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE (group_id, user_id)
);

COMMENT ON TABLE public.group_members IS '그룹 멤버십 (ADMIN=방장, MEMBER=일반)';

-- ============================================================
-- 4. workout_records 테이블 (운동 인증 기록)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workout_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  storage_path TEXT,
  workout_type TEXT NOT NULL DEFAULT '기타',
  memo TEXT,
  photo_expires_at TIMESTAMPTZ,
  is_photo_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 같은 그룹에서 같은 유저가 하루에 한 번만 인증 가능
  UNIQUE (group_id, user_id, record_date)
);

COMMENT ON TABLE public.workout_records IS '일일 운동 사진 인증 기록';
COMMENT ON COLUMN public.workout_records.record_date IS '인증 날짜 (YYYY-MM-DD, 하루 1회 제한용)';
COMMENT ON COLUMN public.workout_records.photo_expires_at IS '사진 만료 시각 (업로드 + 7일)';
COMMENT ON COLUMN public.workout_records.is_photo_deleted IS '7일 경과 사진 삭제 여부';

-- photo_expires_at 자동 설정 트리거
CREATE OR REPLACE FUNCTION set_photo_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.photo_expires_at := NEW.created_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_photo_expires_at
  BEFORE INSERT ON public.workout_records
  FOR EACH ROW
  EXECUTE FUNCTION set_photo_expires_at();

-- ============================================================
-- 5. weekly_settlements 테이블 (주간 정산 결과)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year_week TEXT NOT NULL, -- 예: '2026-W37'
  completed_count INTEGER DEFAULT 0 NOT NULL,
  target_count INTEGER DEFAULT 3 NOT NULL,
  penalty_amount INTEGER DEFAULT 0 NOT NULL,
  bonus_points_earned INTEGER DEFAULT 0 NOT NULL,
  is_penalty_paid BOOLEAN DEFAULT FALSE NOT NULL,
  settled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE (group_id, user_id, year_week)
);

COMMENT ON TABLE public.weekly_settlements IS '주간 정산 결과 (벌금 + 보너스 포인트)';
COMMENT ON COLUMN public.weekly_settlements.year_week IS 'ISO 주차 (예: 2026-W37)';
COMMENT ON COLUMN public.weekly_settlements.penalty_amount IS '부과 벌금 (미달 시 200원, 달성 시 0원)';
COMMENT ON COLUMN public.weekly_settlements.bonus_points_earned IS '초과 달성 보너스 포인트';
COMMENT ON COLUMN public.weekly_settlements.is_penalty_paid IS '방장 확인용 벌금 납부 여부';

-- ============================================================
-- 6. point_histories 테이블 (포인트 적립/사용 내역)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.point_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  year_week TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.point_histories IS '보너스 포인트 변동 이력 (적립/사용)';
COMMENT ON COLUMN public.point_histories.points_change IS '포인트 변동량 (+1, +2, -X 등)';
COMMENT ON COLUMN public.point_histories.reason IS '사유 (주간 초과 달성 보너스 등)';

-- ============================================================
-- 7. Row Level Security (RLS) 정책
-- ============================================================

-- users: 자기 정보만 읽기/쓰기
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7.1 헬퍼 함수 (RLS 무한 재귀 방지용 SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role = 'ADMIN'
  );
$$;

-- groups: 멤버만 조회 가능, 누구나 생성 가능
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view group"
  ON public.groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_group_member(id, auth.uid())
  );

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admin can update group"
  ON public.groups FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_group_admin(id, auth.uid())
  );

-- group_members: 같은 그룹 멤버만 조회, 자기 가입/탈퇴
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view co-members"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- workout_records: 같은 그룹 멤버만 조회, 자기만 작성
ALTER TABLE public.workout_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view workout records"
  ON public.workout_records FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Users can create own workout records"
  ON public.workout_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout records"
  ON public.workout_records FOR UPDATE
  USING (auth.uid() = user_id);

-- weekly_settlements: 같은 그룹 멤버만 조회
ALTER TABLE public.weekly_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view settlements"
  ON public.weekly_settlements FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

-- point_histories: 자기 포인트만 조회
ALTER TABLE public.point_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point history"
  ON public.point_histories FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. 인덱스 (성능 최적화)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workout_records_group_date
  ON public.workout_records(group_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_records_user_date
  ON public.workout_records(user_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_workout_records_expires
  ON public.workout_records(photo_expires_at)
  WHERE is_photo_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_weekly_settlements_group_week
  ON public.weekly_settlements(group_id, year_week);

CREATE INDEX IF NOT EXISTS idx_group_members_user
  ON public.group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code
  ON public.groups(invite_code);

CREATE INDEX IF NOT EXISTS idx_point_histories_user
  ON public.point_histories(user_id, created_at DESC);

-- ============================================================
-- 9. Supabase Storage 버킷 설정
-- (Supabase Dashboard 또는 SQL로 실행)
-- ============================================================

-- workout-photos 버킷 생성 (public 읽기 허용)
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-photos', 'workout-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: 인증된 유저만 업로드 가능
CREATE POLICY "Authenticated users can upload workout photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'workout-photos'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: 누구나 읽기 가능 (public 버킷)
CREATE POLICY "Anyone can view workout photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workout-photos');

-- Storage RLS: 서비스 역할만 삭제 가능 (자동 만료 삭제용)
CREATE POLICY "Service role can delete expired photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'workout-photos'
    AND auth.role() = 'service_role'
  );
