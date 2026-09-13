"use client";

import { useState, useRef } from "react";
import { Camera, X, Upload, CheckCircle2, Image as ImageIcon, RotateCcw, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitWorkoutRecord } from "@/app/actions/workout";

interface WorkoutUploadModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WORKOUT_TAGS = ["유산소", "웨이트", "러닝", "필라테스", "스트레칭", "기타"];

/**
 * 모바일 및 저사양 기기에서도 OOM이나 WebWorker 충돌 없이
 * 초경량으로 동작하는 순수 HTML5 Canvas 이미지 리사이징 헬퍼
 */
async function compressImageSafely(file: File): Promise<File> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const cleanName = file.name.replace(/\.[^.]+$/, "") || "workout";
              const compressedFile = new File([blob], `${cleanName}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.82
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}

export default function WorkoutUploadModal({
  groupId,
  isOpen,
  onClose,
  onSuccess,
}: WorkoutUploadModalProps) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("기타");
  const [memo, setMemo] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
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
    setIsCompressing(false);
    setIsUploading(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isUploading) return;
    resetForm();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일(JPG, PNG 등)만 등록 가능합니다.");
      return;
    }

    try {
      setError(null);
      setIsCompressing(true);

      // Canvas 기반 안전 압축 (1280px, 0.82 quality)
      const compressedFile = await compressImageSafely(file);
      setSelectedFile(compressedFile);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(compressedFile);
      setPreviewUrl(url);
    } catch (err: any) {
      console.error("이미지 처리 실패:", err);
      // 압축 실패 시 원본 사용
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } finally {
      setIsCompressing(false);
      // 인풋 값 리셋하여 동일 파일 재선택 가능하게 처리
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !groupId || isUploading) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("groupId", groupId);
      formData.set("workoutType", selectedTag);
      formData.set("memo", memo);
      formData.set("photo", selectedFile);

      const result = await submitWorkoutRecord(formData);

      if (result?.error) {
        setError(result.error);
        setIsUploading(false);
        return;
      }

      onSuccess();
      handleClose();
      router.refresh();
    } catch (err: any) {
      console.error("업로드 에러:", err);
      setError(err.message || "업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Backdrop with Click Protection */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isUploading) {
            handleClose();
          }
        }}
      />

      {/* Modal Bottom Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 z-[110] bg-[var(--hf-bg)] rounded-t-3xl shadow-2xl animate-slide-up-modal max-h-[92vh] flex flex-col border-t border-[var(--hf-border)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hf-border)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--hf-text-primary)]">오운완 인증하기</h2>
              <p className="text-[11px] text-[var(--hf-text-muted)]">오늘의 운동을 사진으로 인증하세요</p>
            </div>
          </div>
          <button
            disabled={isUploading}
            onClick={handleClose}
            className="p-2 -mr-2 text-[var(--hf-text-muted)] hover:text-[var(--hf-text-primary)] transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto pb-8 space-y-5">
          {/* Hidden File Inputs */}
          {/* 1. Camera Input (forces native camera) */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={cameraInputRef}
            onChange={handleFileChange}
            capture="environment"
          />

          {/* 2. Gallery Input (opens album/gallery picker safely without killing webview) */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={galleryInputRef}
            onChange={handleFileChange}
          />

          {/* Photo Preview or Selection Area */}
          <div>
            {isCompressing ? (
              <div className="w-full aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-2.5 bg-black/5 dark:bg-white/5 border border-dashed border-[var(--hf-border)]">
                <div className="w-8 h-8 rounded-full border-3 border-purple-500 border-t-transparent animate-spin" />
                <span className="text-xs font-semibold text-[var(--hf-text-muted)]">사진 처리 중...</span>
              </div>
            ) : previewUrl ? (
              /* Photo Preview State */
              <div className="space-y-2.5">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/10 border border-[var(--hf-border)] shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>다시 선택</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Choice View: Camera vs Gallery */
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[var(--hf-text-muted)] mb-1">사진 등록 방식 선택</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Direct Camera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 active:scale-[0.98] transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="block font-bold text-xs text-[var(--hf-text-primary)]">카메라 촬영</span>
                      <span className="block text-[10px] text-[var(--hf-text-muted)] mt-0.5">지금 바로 촬영</span>
                    </div>
                  </button>

                  {/* Option 2: Gallery/Album */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 active:scale-[0.98] transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="block font-bold text-xs text-[var(--hf-text-primary)]">앨범에서 선택</span>
                      <span className="block text-[10px] text-[var(--hf-text-muted)] mt-0.5">갤러리 사진 불러오기</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-[var(--hf-text-primary)] mb-2">
              어떤 운동을 하셨나요?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WORKOUT_TAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-black/5 dark:bg-white/5 text-[var(--hf-text-secondary)] border border-[var(--hf-border)]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs font-bold text-[var(--hf-text-primary)] mb-2">
              오늘의 한 줄 평 (선택)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 하체 불태웠다! 오운완 완료 🔥"
              maxLength={40}
              className="w-full px-4 py-3 rounded-xl text-xs outline-none bg-black/5 dark:bg-white/5 border border-[var(--hf-border)] text-[var(--hf-text-primary)] transition-colors focus:border-purple-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading || isCompressing}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: "var(--hf-gradient-primary)",
              boxShadow: "0 8px 24px rgba(108, 92, 231, 0.35)",
            }}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4 animate-bounce" />
                인증 등록 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                인증 완료하기
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
