"use client";

import { useState, useEffect } from "react";
import { getGroupFeed, cleanupExpiredPhotosAction } from "@/app/actions/workout";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";
import { Clock, ImageOff, User, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

interface FeedRecord {
  id: string;
  record_date: string;
  image_url: string | null;
  workout_type: string;
  memo: string | null;
  created_at: string;
  photo_expires_at: string;
  is_photo_deleted: boolean;
  users: {
    id: string;
    nickname: string;
    profile_image: string | null;
  } | null;
}

export default function GroupFeed({ groupId }: { groupId: string }) {
  const [feed, setFeed] = useState<FeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeed = async () => {
    setIsLoading(true);
    // 백그라운드 만료 사진 정리 트리거
    cleanupExpiredPhotosAction().catch(() => {});

    const result = await getGroupFeed(groupId);
    if (result.data) {
      setFeed(result.data as unknown as FeedRecord[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadFeed();
    // Expose reload function to window for the parent to call after upload
    (window as any).reloadGroupFeed = loadFeed;
    return () => {
      delete (window as any).reloadGroupFeed;
    };
  }, [groupId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--hf-primary)] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[var(--hf-primary)] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[var(--hf-primary)] animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="card p-8 text-center animate-fade-in-up" style={{ borderStyle: "dashed" }}>
        <Clock className="w-10 h-10 mx-auto mb-3 text-[var(--hf-text-muted)]" />
        <p className="text-sm font-medium mb-1 text-[var(--hf-text-secondary)]">아직 인증된 기록이 없어요</p>
        <p className="text-xs text-[var(--hf-text-muted)]">첫 인증의 주인공이 되어보세요!</p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="space-y-4 pb-6">
      {feed.map((record) => {
        // 만료 여부 판정: DB 플래그 또는 현재 시간 기준 7일 경과
        const isExpired =
          record.is_photo_deleted ||
          !record.image_url ||
          (record.photo_expires_at && new Date(record.photo_expires_at) < now);

        return (
          <div key={record.id} className="card overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--hf-bg)] border border-[var(--hf-border)] shrink-0">
                  {record.users?.profile_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.users.profile_image}
                      alt={record.users.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--hf-text-primary)]">
                    {record.users?.nickname}
                  </p>
                  <p className="text-[10px] text-[var(--hf-text-muted)]">
                    {formatDistanceToNow(new Date(record.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
              <div
                className="badge"
                style={{
                  background: "rgba(108, 92, 231, 0.1)",
                  color: "var(--hf-primary)",
                }}
              >
                {record.workout_type}
              </div>
            </div>

            {/* Photo or Expired Card */}
            <div className="relative w-full aspect-[4/5] bg-black/5">
              {isExpired ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(108, 92, 231, 0.04) 0%, rgba(0, 206, 201, 0.04) 100%)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
                    style={{
                      background: "var(--hf-bg-elevated)",
                      border: "1px solid var(--hf-border)",
                    }}
                  >
                    <ImageOff className="w-6 h-6 text-[var(--hf-text-muted)]" />
                  </div>

                  <span className="text-xs font-bold text-[var(--hf-text-primary)] mb-1">
                    7일 보관 기간이 만료된 사진입니다
                  </span>
                  <p className="text-[11px] text-[var(--hf-text-muted)] max-w-[220px] leading-relaxed mb-3">
                    서버 저장 공간 정책에 따라 사진 파일은 안전하게 정리되었습니다.
                  </p>

                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
                    style={{
                      background: "rgba(0, 184, 148, 0.1)",
                      color: "var(--hf-success)",
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    운동 기록 & 메모는 영구 보존됩니다
                  </div>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={record.image_url!}
                    alt="Workout record"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <Clock className="w-3 h-3 text-white/80" />
                    <span className="text-[10px] text-white/90 font-medium">
                      {format(new Date(record.photo_expires_at), "M/d HH:mm")} 만료 (7일 보관)
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Memo */}
            {record.memo && (
              <div className="p-4 border-t border-[var(--hf-border-light)] bg-[var(--hf-bg-card)]">
                <p className="text-sm text-[var(--hf-text-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--hf-text-primary)] mr-2">
                    {record.users?.nickname}
                  </span>
                  {record.memo}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
