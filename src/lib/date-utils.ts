/**
 * HolyFit 주간 정산 및 날짜 관련 유틸리티
 * 기준: 매주 월요일 00:00:00 ~ 일요일 23:59:59 (ISO-8601 Week)
 */

/**
 * 주어진 날짜(기본값: 오늘)의 ISO 주차 문자열을 반환 (예: "2026-W37")
 */
export function getISOWeekString(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // 목요일 기준으로 연도와 주차 결정
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * 주어진 ISO 주차 문자열의 이전 주차 문자열을 반환 (예: "2026-W37" -> "2026-W36")
 */
export function getPreviousWeekString(currentWeek: string = getISOWeekString()): string {
  const parts = currentWeek.split("-W");
  const year = parseInt(parts[0], 10);
  const week = parseInt(parts[1], 10);

  if (week > 1) {
    return `${year}-W${String(week - 1).padStart(2, "0")}`;
  } else {
    // 전년도 마지막 주차 계산 (대략 12월 28일 기준)
    const prevYear = year - 1;
    const dec28 = new Date(Date.UTC(prevYear, 11, 28));
    return getISOWeekString(dec28);
  }
}

/**
 * 주어진 날짜가 속한 주(월요일 ~ 일요일)의 YYYY-MM-DD 범위 및 요일 리스트 반환
 */
export function getCurrentWeekRange(d: Date = new Date()): {
  startDateStr: string; // 월요일 YYYY-MM-DD
  endDateStr: string;   // 일요일 YYYY-MM-DD
  yearWeek: string;     // 예: "2026-W37"
  days: { dateStr: string; dayName: string; isPastOrToday: boolean; isToday: boolean }[];
} {
  const current = new Date(d);
  const day = current.getDay();
  // 일요일(0)을 7로 취급하여 월요일(1) 기준 오프셋 계산
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };

  const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
  const todayStr = formatDate(d);

  const days = Array.from({ length: 7 }, (_, i) => {
    const iterDate = new Date(monday);
    iterDate.setDate(monday.getDate() + i);
    const dateStr = formatDate(iterDate);
    return {
      dateStr,
      dayName: dayNames[i],
      isPastOrToday: dateStr <= todayStr,
      isToday: dateStr === todayStr,
    };
  });

  return {
    startDateStr: formatDate(monday),
    endDateStr: formatDate(sunday),
    yearWeek: getISOWeekString(monday),
    days,
  };
}

/**
 * 특정 ISO 주차 문자열("2026-W37")의 월요일 및 일요일 날짜 문자열(YYYY-MM-DD)을 반환
 */
export function getRangeFromYearWeek(yearWeek: string): {
  startDateStr: string;
  endDateStr: string;
} {
  const parts = yearWeek.split("-W");
  const year = parseInt(parts[0], 10);
  const week = parseInt(parts[1], 10);

  // 1월 4일은 ISO 규정에 의해 항상 1주차에 속함
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4.getTime() - (day - 1) * 86400000);

  const targetMonday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
  const targetSunday = new Date(targetMonday.getTime() + 6 * 86400000);

  const formatDate = (dt: Date) => {
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    startDateStr: formatDate(targetMonday),
    endDateStr: formatDate(targetSunday),
  };
}
