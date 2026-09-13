"use client";

import { useState, useRef } from "react";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { Camera, X, Upload, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitWorkoutRecord } from "@/app/actions/workout";

interface WorkoutUploadModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WORKOUT_TAGS = ["유산소", "웨이트", "러닝", "필라테스", "스트레칭", "기타"];

export default function WorkoutUploadModal({
  groupId,
  isOpen,
  onClose,
  onSuccess,
}: WorkoutUploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("기타");
  const [memo, setMemo] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedTag("기타");
    setMemo("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    try {
      setError(null);
      // 압축 옵션: max 1920x1920, 1MB 이하, webp 변환 권장
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/jpeg"
      };

      const compressedFile = await imageCompression(file, options);
      setSelectedFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (err) {
      console.error("이미지 압축 실패:", err);
      setError("이미지 처리 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !groupId) return;

    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase 설정 오류");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      // 1. Storage에 이미지 업로드
      const fileExt = "jpg"; // imageCompression makes it jpeg
      const fileName = `${user.id}/${groupId}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("workout-photos")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // URL 가져오기
      const { data: publicUrlData } = supabase.storage
        .from("workout-photos")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // 2. DB에 기록 저장 (Server Action 호출)
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("imageUrl", imageUrl);
      formData.set("storagePath", filePath);
      formData.set("workoutType", selectedTag);
      formData.set("memo", memo);

      const result = await submitWorkoutRecord(formData);

      if (result?.error) {
        // DB 저장 실패 시 업로드한 이미지 롤백 시도
        await supabase.storage.from("workout-photos").remove([filePath]);
        throw new Error(result.error);
      }

      onSuccess();
      handleClose();
      router.refresh();
    } catch (err: any) {
      console.error("업로드 에러:", err);
      setError(err.message || "업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      <div className="fixed inset-x-0 bottom-0 z-[110] bg-[var(--hf-bg)] rounded-t-3xl shadow-2xl animate-slide-up-modal max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hf-border)] shrink-0">
          <h2 className="text-lg font-bold text-[var(--hf-text-primary)]">오운완 인증하기</h2>
          <button onClick={handleClose} className="p-2 -mr-2 text-[var(--hf-text-muted)] hover:text-[var(--hf-text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto pb-8 space-y-6">
          {/* Photo Section */}
          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              capture="environment" // 모바일에서 기본적으로 후면 카메라 실행
            />
            
            {previewUrl ? (
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-black/5 border border-[var(--hf-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/5] rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[var(--hf-primary-light)] bg-[rgba(108,92,231,0.03)] hover:bg-[rgba(108,92,231,0.06)] transition-colors text-[var(--hf-primary)]"
              >
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm">사진 촬영 또는 앨범 선택</span>
              </button>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-[var(--hf-text-primary)] mb-3">어떤 운동을 하셨나요?</label>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: selectedTag === tag ? "var(--hf-primary)" : "var(--hf-bg-card)",
                    color: selectedTag === tag ? "white" : "var(--hf-text-secondary)",
                    border: selectedTag === tag ? "none" : "1px solid var(--hf-border)"
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-sm font-semibold text-[var(--hf-text-primary)] mb-3">오늘의 한 줄 평 (선택)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 오늘도 오운완 성공! 뿌듯하다"
              maxLength={40}
              className="w-full px-4 py-3.5 rounded-xl text-sm outline-none bg-[var(--hf-bg)] border-[1.5px] border-[var(--hf-border)] text-[var(--hf-text-primary)] transition-colors focus:border-[var(--hf-primary)]"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-[var(--hf-danger)]">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="w-full py-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--hf-gradient-primary)",
              boxShadow: "var(--hf-shadow-lg)"
            }}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4 animate-bounce" />
                업로드 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                인증 완료하기
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
