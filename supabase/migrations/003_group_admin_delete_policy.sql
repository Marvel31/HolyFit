-- ============================================================
-- HolyFit: 그룹 관리자(ADMIN) 전용 삭제 및 정리 RLS 정책
-- ============================================================

-- 1. groups 테이블: 방장만 그룹 삭제 가능
CREATE POLICY "Group admin can delete group"
  ON public.groups FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.is_group_admin(id, auth.uid())
  );

-- 2. workout_records 테이블: 방장은 그룹 내 인증 기록 일괄 삭제 가능 (그룹 초기화용)
CREATE POLICY "Group admin can delete workout records in group"
  ON public.workout_records FOR DELETE
  USING (
    public.is_group_admin(group_id, auth.uid())
  );

-- 3. weekly_settlements 테이블: 방장은 그룹 내 주간 정산 기록 일괄 삭제 가능 (그룹 초기화용)
CREATE POLICY "Group admin can delete weekly settlements in group"
  ON public.weekly_settlements FOR DELETE
  USING (
    public.is_group_admin(group_id, auth.uid())
  );
