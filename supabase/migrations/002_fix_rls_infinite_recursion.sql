-- ============================================================
-- HolyFit: RLS 무한 재귀(Infinite Recursion code 42P17) 해결 패치
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. RLS 우회(SECURITY DEFINER) 멤버십 확인 헬퍼 함수
-- RLS 정책 평가 중 group_members를 재귀 조회하지 않도록 search_path와 SECURITY DEFINER 적용
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

-- 2. 기존 재귀 정책 삭제
DROP POLICY IF EXISTS "Group members can view group" ON public.groups;
DROP POLICY IF EXISTS "Group admin can update group" ON public.groups;
DROP POLICY IF EXISTS "Members can view co-members" ON public.group_members;
DROP POLICY IF EXISTS "Group members can view workout records" ON public.workout_records;
DROP POLICY IF EXISTS "Group members can view settlements" ON public.weekly_settlements;

-- 3. 안전한 새 RLS 정책 생성 (무한 재귀 없음)

-- groups 정책: 내가 만든 그룹이거나, 내가 속한 그룹이면 조회 가능
CREATE POLICY "Group members can view group"
  ON public.groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_group_member(id, auth.uid())
  );

-- groups 관리자 수정 정책
CREATE POLICY "Group admin can update group"
  ON public.groups FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_group_admin(id, auth.uid())
  );

-- group_members 정책: 본인 레코드이거나 같은 그룹 멤버이면 조회 가능
CREATE POLICY "Members can view co-members"
  ON public.group_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

-- workout_records 정책: 같은 그룹 멤버이면 조회 가능
CREATE POLICY "Group members can view workout records"
  ON public.workout_records FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );

-- weekly_settlements 정책: 같은 그룹 멤버이면 조회 가능
CREATE POLICY "Group members can view settlements"
  ON public.weekly_settlements FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_group_member(group_id, auth.uid())
  );
