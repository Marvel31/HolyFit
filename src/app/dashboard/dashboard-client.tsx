"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { getGroupMembers } from "@/app/actions/member";
import {
  deleteGroup,
  resetGroup,
  resetGroupPenalties,
  resetGroupPoints,
} from "@/app/actions/group";
import GroupFeed from "@/components/workout/group-feed";
import WorkoutUploadModal from "@/components/workout/workout-upload-modal";
import WeeklyProgressCard from "@/components/home/weekly-progress-card";
import SettlementDashboard from "@/components/settlement/settlement-dashboard";
import {
  ChevronDown,
  Plus,
  Ticket,
  LogOut,
  Copy,
  Check,
  Users,
  Star,
  Camera,
  BarChart3,
  User,
  Shield,
  Coins,
  Settings,
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

interface Profile {
  id: string;
  nickname: string;
  profile_image: string | null;
  total_bonus_points: number;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  weekly_target_count: number;
  penalty_amount: number;
  role: string;
}

interface GroupMember {
  id: string;
  role: string;
  joined_at: string;
  users: {
    id: string;
    nickname: string;
    profile_image: string | null;
  } | null;
}

interface DashboardClientProps {
  profile: Profile;
  groups: Group[];
}

type BottomTab = "home" | "settlement" | "my";

export default function DashboardClient({
  profile,
  groups,
}: DashboardClientProps) {
  const router = useRouter();
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>("home");

  // 방장 관리 모달 상태
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageConfirmAction, setManageConfirmAction] = useState<
    "delete" | "reset" | "reset_penalties" | "reset_points" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 뒤로 가기(Back) 제어 및 2회 연속 클릭 종료 토스트 상태
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressRef = useRef<number>(0);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyTrapInitRef = useRef(false);

  // 최신 상태를 popstate 이벤트 리스너에서 참조하기 위한 Refs
  const manageConfirmActionRef = useRef(manageConfirmAction);
  manageConfirmActionRef.current = manageConfirmAction;

  const isManageModalOpenRef = useRef(isManageModalOpen);
  isManageModalOpenRef.current = isManageModalOpen;

  const isUploadModalOpenRef = useRef(isUploadModalOpen);
  isUploadModalOpenRef.current = isUploadModalOpen;

  const showGroupMenuRef = useRef(showGroupMenu);
  showGroupMenuRef.current = showGroupMenu;

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const showExitToastRef = useRef(showExitToast);
  showExitToastRef.current = showExitToast;

  useEffect(() => {
    // React Strict Mode에서 중복 호출 방지
    if (historyTrapInitRef.current) return;
    historyTrapInitRef.current = true;

    // history 스택에 트랩 엔트리를 2개 추가하여 안정적으로 가로채기
    const TRAP_KEY = "holyfitTrap";
    window.history.replaceState({ [TRAP_KEY]: true }, "");
    window.history.pushState({ [TRAP_KEY]: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      // Next.js 내부 라우팅은 무시 (holyfitTrap 키가 없는 state)
      if (e.state && !e.state[TRAP_KEY]) return;

      // 항상 트랩을 다시 설정 (먼저 pushState해서 다음 back도 가로챔)
      window.history.pushState({ [TRAP_KEY]: true }, "");

      // 1. 방장 2단계 확인 뷰가 열려있는 경우 -> 관리 선택 뷰로 복귀
      if (manageConfirmActionRef.current) {
        setManageConfirmAction(null);
        return;
      }

      // 2. 방장 관리 모달이 열려있는 경우 -> 모달 닫기
      if (isManageModalOpenRef.current) {
        setIsManageModalOpen(false);
        return;
      }

      // 3. 오운완 인증 업로드 모달이 열려있는 경우 -> 모달 닫기
      if (isUploadModalOpenRef.current) {
        setIsUploadModalOpen(false);
        return;
      }

      // 4. 그룹 선택 드롭다운 메뉴가 열려있는 경우 -> 드롭다운 닫기
      if (showGroupMenuRef.current) {
        setShowGroupMenu(false);
        return;
      }

      // 5. 하위 탭(정산 탭, 마이 탭)에 있는 경우 -> 홈 탭으로 복귀
      if (activeTabRef.current !== "home") {
        setActiveTab("home");
        return;
      }

      // 6. 최상위 홈 화면인 경우 -> 2초 내 재클릭 시 종료
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // 2초 내 두 번째 누름 -> 앱 종료 시도
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        setShowExitToast(false);

        // 트랩 엔트리 2개를 모두 제거하고 원래 history로 돌아가기
        // 이렇게 하면 인앱 브라우저/PWA가 자연스럽게 닫힘
        window.history.go(-(window.history.length - 1));
      } else {
        // 첫 번째 누름 -> 종료 안내 토스트 노출
        lastBackPressRef.current = now;
        setShowExitToast(true);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, []);

  const currentGroup = groups[selectedGroupIndex] as Group | undefined;
  const hasGroups = groups.length > 0;

  const handleResetGroup = async () => {
    if (!currentGroup) return;
    setIsProcessing(true);
    try {
      const res = await resetGroup(currentGroup.id);
      if (res?.error) {
        alert(`초기화 실패: ${res.error}`);
      } else {
        alert(
          `'${currentGroup.name}' 그룹의 모든 운동 인증 및 정산 내역이 성공적으로 초기화되었습니다.`
        );
        setManageConfirmAction(null);
        setIsManageModalOpen(false);
        if ((window as any).reloadGroupFeed) {
          (window as any).reloadGroupFeed();
        }
        if ((window as any).reloadWeeklyProgress) {
          (window as any).reloadWeeklyProgress();
        }
        if ((window as any).reloadSettlementDashboard) {
          (window as any).reloadSettlementDashboard();
        }
        router.refresh();
      }
    } catch (err: any) {
      alert(`오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPenalties = async () => {
    if (!currentGroup) return;
    setIsProcessing(true);
    try {
      const res = await resetGroupPenalties(currentGroup.id);
      if (res?.error) {
        alert(`벌금 초기화 실패: ${res.error}`);
      } else {
        alert(
          `'${currentGroup.name}' 그룹의 모든 주간 벌금 내역이 0원으로 초기화되었습니다.`
        );
        setManageConfirmAction(null);
        setIsManageModalOpen(false);
        if ((window as any).reloadWeeklyProgress) {
          (window as any).reloadWeeklyProgress();
        }
        if ((window as any).reloadSettlementDashboard) {
          (window as any).reloadSettlementDashboard();
        }
        router.refresh();
      }
    } catch (err: any) {
      alert(`오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPoints = async () => {
    if (!currentGroup) return;
    setIsProcessing(true);
    try {
      const res = await resetGroupPoints(currentGroup.id);
      if (res?.error) {
        alert(`포인트 초기화 실패: ${res.error}`);
      } else {
        alert(
          `'${currentGroup.name}' 그룹의 모든 보너스 포인트 내역이 0P로 초기화되었습니다.`
        );
        setManageConfirmAction(null);
        setIsManageModalOpen(false);
        if ((window as any).reloadWeeklyProgress) {
          (window as any).reloadWeeklyProgress();
        }
        if ((window as any).reloadSettlementDashboard) {
          (window as any).reloadSettlementDashboard();
        }
        router.refresh();
      }
    } catch (err: any) {
      alert(`오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentGroup) return;
    setIsProcessing(true);
    try {
      const res = await deleteGroup(currentGroup.id);
      if (res?.error) {
        alert(`삭제 실패: ${res.error}`);
        setIsProcessing(false);
      } else {
        alert(`'${currentGroup.name}' 그룹이 정상적으로 삭제되었습니다.`);
        setManageConfirmAction(null);
        setIsManageModalOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      alert(`오류가 발생했습니다: ${err.message || err}`);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (currentGroup) {
      setIsLoadingMembers(true);
      getGroupMembers(currentGroup.id).then((res) => {
        if (res.data) {
          setMembers(res.data as unknown as GroupMember[]);
        }
        setIsLoadingMembers(false);
      });
    }
  }, [currentGroup]);

  const copyInviteCode = async () => {
    if (!currentGroup) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentGroup.invite_code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentGroup.invite_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.warn("클립보드 복사 폴백 처리:", e);
    }
  };

  return (
    <main className="flex flex-col flex-1 pb-24">
      {/* ===== Header ===== */}
      <header className="glass sticky top-0 z-30 px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Group Selector */}
          <div className="relative">
            <button
              onClick={() => hasGroups && setShowGroupMenu(!showGroupMenu)}
              className="flex items-center gap-2 py-1"
            >
              <h1 className="text-lg font-bold" style={{ color: "var(--hf-text-primary)" }}>
                {currentGroup?.name ?? "HolyFit"}
              </h1>
              {hasGroups && (
                <ChevronDown
                  className="w-4 h-4 transition-transform"
                  style={{
                    color: "var(--hf-text-muted)",
                    transform: showGroupMenu ? "rotate(180deg)" : "rotate(0)",
                  }}
                />
              )}
            </button>

            {/* Group Dropdown */}
            {showGroupMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowGroupMenu(false)}
                />
                <div
                  className="absolute top-full left-0 mt-2 w-56 rounded-xl overflow-hidden z-50 animate-scale-in"
                  style={{
                    background: "var(--hf-bg-elevated)",
                    border: "1px solid var(--hf-border)",
                    boxShadow: "var(--hf-shadow-elevated)",
                  }}
                >
                  {groups.map((group, index) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroupIndex(index);
                        setShowGroupMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors"
                      style={{
                        background:
                          index === selectedGroupIndex
                            ? "rgba(108, 92, 231, 0.08)"
                            : "transparent",
                        borderBottom:
                          index < groups.length - 1
                            ? "1px solid var(--hf-border-light)"
                            : "none",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background:
                            index === selectedGroupIndex
                              ? "var(--hf-gradient-primary)"
                              : "var(--hf-bg)",
                        }}
                      >
                        <Users
                          className="w-4 h-4"
                          style={{
                            color:
                              index === selectedGroupIndex
                                ? "#FFFFFF"
                                : "var(--hf-text-muted)",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--hf-text-primary)" }}
                        >
                          {group.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--hf-text-muted)" }}
                        >
                          {group.role === "ADMIN" ? "방장" : "멤버"}
                        </p>
                      </div>
                      {index === selectedGroupIndex && (
                        <Check className="w-4 h-4" style={{ color: "var(--hf-primary)" }} />
                      )}
                    </button>
                  ))}

                  <div className="p-2 border-t border-[var(--hf-border-light)] bg-black/5 dark:bg-white/5 space-y-1">
                    <Link
                      href="/groups/create"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-[var(--hf-primary)] hover:bg-black/5"
                    >
                      <Plus className="w-3.5 h-3.5" /> 새 그룹 만들기
                    </Link>
                    <Link
                      href="/groups/join"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-[var(--hf-text-secondary)] hover:bg-black/5"
                    >
                      <Ticket className="w-3.5 h-3.5" /> 초대 코드로 가입
                    </Link>
                    {currentGroup?.role === "ADMIN" && (
                      <button
                        onClick={() => {
                          setShowGroupMenu(false);
                          setManageConfirmAction(null);
                          setIsManageModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" /> 그룹 관리 (방장 전용)
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Points Badge & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("settlement")}
              className="badge cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: "rgba(108, 92, 231, 0.1)",
                color: "var(--hf-primary)",
              }}
            >
              <Star className="w-3 h-3 fill-[var(--hf-primary)]" />
              {profile.total_bonus_points}P
            </button>
            <button
              onClick={() => signOut()}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "var(--hf-bg)" }}
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" style={{ color: "var(--hf-text-muted)" }} />
            </button>
          </div>
        </div>
      </header>

      {/* ===== Content By Active Tab ===== */}
      {hasGroups && currentGroup ? (
        <div className="px-5 mt-4">
          {/* TAB 1: HOME */}
          {activeTab === "home" && (
            <div className="space-y-4">
              {/* Weekly Progress Card */}
              <WeeklyProgressCard groupId={currentGroup.id} />

              {/* Invite Code Card */}
              <div className="card p-4 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--hf-text-muted)" }}>
                      초대 코드
                    </p>
                    <p
                      className="text-lg font-bold tracking-widest"
                      style={{ color: "var(--hf-primary)" }}
                    >
                      {currentGroup.invite_code}
                    </p>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: copiedCode
                        ? "rgba(0, 184, 148, 0.1)"
                        : "var(--hf-bg)",
                    }}
                  >
                    {copiedCode ? (
                      <Check className="w-5 h-5" style={{ color: "var(--hf-success)" }} />
                    ) : (
                      <Copy className="w-5 h-5" style={{ color: "var(--hf-text-muted)" }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Group Rules Info */}
              <div className="card p-4 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--hf-text-muted)]">
                        그룹 운동 목표 및 벌금 룰
                      </span>
                      {currentGroup.role === "ADMIN" && (
                        <button
                          onClick={() => {
                            setManageConfirmAction(null);
                            setIsManageModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="그룹 관리 (방장 전용)"
                        >
                          <Settings className="w-3 h-3" />
                          <span>관리</span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[var(--hf-text-primary)] mt-0.5">
                      {currentGroup.description || "함께하는 건강한 습관!"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="badge"
                      style={{
                        background: "rgba(0, 206, 201, 0.1)",
                        color: "var(--hf-accent)",
                      }}
                    >
                      🎯 주 {currentGroup.weekly_target_count}회
                    </div>
                    <div
                      className="badge"
                      style={{
                        background: "rgba(255, 107, 107, 0.1)",
                        color: "var(--hf-danger)",
                      }}
                    >
                      💰 {currentGroup.penalty_amount}원
                    </div>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="card p-4 animate-fade-in-up">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--hf-text-primary)" }}>
                  <Users className="w-4 h-4" /> 멤버 ({members.length}명)
                </h3>
                <div className="flex overflow-x-auto pb-2 gap-3 snap-x scrollbar-hide">
                  {isLoadingMembers ? (
                    <div className="text-xs py-2" style={{ color: "var(--hf-text-muted)" }}>로딩 중...</div>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="flex flex-col items-center gap-1 min-w-[60px] snap-start">
                        <div className="w-12 h-12 rounded-full overflow-hidden" style={{ background: "var(--hf-bg)", border: "2px solid var(--hf-border)" }}>
                          {member.users?.profile_image ? (
                            <img src={member.users.profile_image} alt={member.users.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="text-center w-full">
                          <p className="text-[10px] font-medium truncate w-full" style={{ color: "var(--hf-text-primary)" }}>
                            {member.users?.nickname}
                          </p>
                          {member.role === "ADMIN" && (
                            <p className="text-[8px] font-bold" style={{ color: "var(--hf-primary)" }}>방장</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Workout Timeline Feed */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--hf-text-primary)" }}>
                    <Camera className="w-5 h-5 text-[var(--hf-primary)]" /> 실시간 인증 피드
                  </h3>
                </div>
                <GroupFeed groupId={currentGroup.id} />
              </div>
              
              {/* Floating Action Button */}
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="fixed right-6 bottom-24 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform z-40 animate-fade-in-up"
                style={{ background: "var(--hf-gradient-primary)", boxShadow: "0 8px 30px rgba(108, 92, 231, 0.4)" }}
              >
                <Camera className="w-6 h-6" />
              </button>

              <WorkoutUploadModal
                groupId={currentGroup.id}
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={() => {
                  if ((window as any).reloadGroupFeed) {
                    (window as any).reloadGroupFeed();
                  }
                  if ((window as any).reloadWeeklyProgress) {
                    (window as any).reloadWeeklyProgress();
                  }
                }}
              />
            </div>
          )}

          {/* TAB 2: SETTLEMENT DASHBOARD */}
          {activeTab === "settlement" && (
            <SettlementDashboard
              groupId={currentGroup.id}
              groupName={currentGroup.name}
            />
          )}

          {/* TAB 3: MY PAGE */}
          {activeTab === "my" && (
            <div className="space-y-4 animate-fade-in">
              {/* Profile Card */}
              <div className="card p-6 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mb-3 border-2 border-[var(--hf-primary)]">
                  {profile.profile_image ? (
                    <img
                      src={profile.profile_image}
                      alt={profile.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-500">
                      {profile.nickname.slice(0, 1)}
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[var(--hf-text-primary)]">
                  {profile.nickname}
                </h2>
                <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  보유 포인트 {profile.total_bonus_points}P
                </div>
              </div>

              {/* Group Memberships */}
              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-bold text-[var(--hf-text-primary)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--hf-primary)]" /> 내가 참여 중인 그룹 ({groups.length}개)
                </h3>
                <div className="space-y-2">
                  {groups.map((g, idx) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedGroupIndex(idx);
                        setActiveTab("home");
                      }}
                      className="p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-black/5"
                      style={{
                        background:
                          idx === selectedGroupIndex
                            ? "rgba(108, 92, 231, 0.06)"
                            : "var(--hf-bg)",
                        border:
                          idx === selectedGroupIndex
                            ? "1px solid var(--hf-primary)"
                            : "1px solid var(--hf-border-light)",
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--hf-text-primary)]">
                            {g.name}
                          </span>
                          {g.role === "ADMIN" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                              방장
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--hf-text-muted)]">
                          목표: 주 {g.weekly_target_count}회 / 벌금 {g.penalty_amount}원
                        </span>
                      </div>
                      <span className="text-xs text-[var(--hf-primary)] font-semibold">
                        {idx === selectedGroupIndex ? "현재 선택됨" : "이동"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    href="/groups/create"
                    className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-[var(--hf-primary)] border border-[var(--hf-primary)] hover:bg-purple-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> 새 그룹
                  </Link>
                  <Link
                    href="/groups/join"
                    className="py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-[var(--hf-text-secondary)] border border-[var(--hf-border)] hover:bg-gray-50"
                  >
                    <Ticket className="w-3.5 h-3.5" /> 초대 가입
                  </Link>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  onClick={() => signOut()}
                  className="w-full py-3.5 rounded-2xl text-xs font-bold text-[var(--hf-danger)] border border-red-200 hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> 로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* No Groups - Empty State */
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center mt-12">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 animate-fade-in-up"
            style={{
              background: "rgba(108, 92, 231, 0.08)",
            }}
          >
            <Users
              className="w-10 h-10"
              style={{ color: "var(--hf-primary-light)" }}
            />
          </div>
          <h2
            className="text-xl font-bold mb-2 animate-fade-in-up"
            style={{ color: "var(--hf-text-primary)" }}
          >
            참여 중인 그룹이 없어요
          </h2>
          <p
            className="text-sm mb-8 animate-fade-in-up"
            style={{ color: "var(--hf-text-secondary)" }}
          >
            새 그룹을 만들거나
            <br />
            초대 코드로 그룹에 참여해보세요!
          </p>

          <div className="w-full max-w-xs space-y-3 animate-fade-in-up">
            <Link
              href="/groups/create"
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: "var(--hf-gradient-primary)",
                boxShadow: "var(--hf-shadow-lg)",
              }}
            >
              <Plus className="w-4 h-4" />
              새 그룹 만들기
            </Link>
            <Link
              href="/groups/join"
              className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: "var(--hf-bg-card)",
                border: "1px solid var(--hf-border)",
                color: "var(--hf-text-primary)",
              }}
            >
              <Ticket className="w-4 h-4" />
              초대 코드로 참여하기
            </Link>
          </div>
        </div>
      )}

      {/* ===== Bottom Tab Bar ===== */}
      <nav className="tab-bar glass fixed bottom-0 left-0 right-0 z-30">
        <div className="flex items-center justify-around h-full px-2 max-w-[430px] mx-auto">
          <TabItem
            icon={<Camera className="w-5 h-5" />}
            label="홈"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />
          <TabItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="정산"
            active={activeTab === "settlement"}
            onClick={() => setActiveTab("settlement")}
          />
          <TabItem
            icon={<User className="w-5 h-5" />}
            label="마이"
            active={activeTab === "my"}
            onClick={() => setActiveTab("my")}
          />
        </div>
      </nav>

      {/* Group Admin Management Modal */}
      {isManageModalOpen && currentGroup && currentGroup.role === "ADMIN" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="card w-full max-w-sm p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--hf-bg-card)",
              border: "1px solid var(--hf-border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--hf-border-light)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--hf-text-primary)]">
                    그룹 관리
                  </h3>
                  <p className="text-xs text-[var(--hf-text-muted)] truncate max-w-[190px]">
                    {currentGroup.name} (방장 전용)
                  </p>
                </div>
              </div>
              <button
                disabled={isProcessing}
                onClick={() => {
                  if (!isProcessing) {
                    setIsManageModalOpen(false);
                    setManageConfirmAction(null);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4 text-[var(--hf-text-muted)]" />
              </button>
            </div>

            {/* Confirmation View */}
            {manageConfirmAction ? (
              <div className="space-y-4 py-1 animate-fade-in">
                <div
                  className="p-4 rounded-2xl border text-center space-y-2"
                  style={{
                    background:
                      manageConfirmAction === "delete"
                        ? "rgba(239, 68, 68, 0.08)"
                        : manageConfirmAction === "reset"
                        ? "rgba(245, 158, 11, 0.08)"
                        : manageConfirmAction === "reset_penalties"
                        ? "rgba(16, 185, 129, 0.08)"
                        : "rgba(99, 102, 241, 0.08)",
                    borderColor:
                      manageConfirmAction === "delete"
                        ? "rgba(239, 68, 68, 0.25)"
                        : manageConfirmAction === "reset"
                        ? "rgba(245, 158, 11, 0.25)"
                        : manageConfirmAction === "reset_penalties"
                        ? "rgba(16, 185, 129, 0.25)"
                        : "rgba(99, 102, 241, 0.25)",
                  }}
                >
                  <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-white dark:bg-black/20 shadow-xs">
                    {manageConfirmAction === "delete" ? (
                      <Trash2 className="w-6 h-6 text-rose-500" />
                    ) : manageConfirmAction === "reset" ? (
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                    ) : manageConfirmAction === "reset_penalties" ? (
                      <Coins className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Star className="w-6 h-6 text-indigo-500" />
                    )}
                  </div>
                  <h4
                    className={`text-sm font-bold ${
                      manageConfirmAction === "delete"
                        ? "text-rose-600 dark:text-rose-400"
                        : manageConfirmAction === "reset"
                        ? "text-amber-600 dark:text-amber-400"
                        : manageConfirmAction === "reset_penalties"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {manageConfirmAction === "delete"
                      ? "정말 그룹을 삭제하시겠습니까?"
                      : manageConfirmAction === "reset"
                      ? "정말 그룹 전체를 초기화하시겠습니까?"
                      : manageConfirmAction === "reset_penalties"
                      ? "벌금 내역을 모두 0원으로 초기화할까요?"
                      : "보너스 포인트를 모두 0P로 초기화할까요?"}
                  </h4>
                  <p className="text-xs text-[var(--hf-text-secondary)] leading-relaxed">
                    {manageConfirmAction === "delete" ? (
                      <>
                        <strong className="text-rose-500 font-semibold">{currentGroup.name}</strong> 그룹이 완전히 영구 삭제됩니다.
                        <br />
                        모든 멤버십, 운동 인증 사진, 주간 정산 기록이 삭제되며 복구할 수 없습니다.
                      </>
                    ) : manageConfirmAction === "reset" ? (
                      <>
                        <strong className="text-amber-500 font-semibold">{currentGroup.name}</strong> 그룹의 설정과 멤버는 유지되며,
                        <br />
                        이번 시즌의 <strong>운동 사진, 인증 피드, 정산 기록만 0건으로 리셋</strong>됩니다.
                      </>
                    ) : manageConfirmAction === "reset_penalties" ? (
                      <>
                        <strong className="text-emerald-500 font-semibold">{currentGroup.name}</strong> 그룹의 모든 주간 벌금 내역이 0원으로 초기화됩니다.
                        <br />
                        운동 인증 기록 및 멤버 포인트는 그대로 유지됩니다.
                      </>
                    ) : (
                      <>
                        <strong className="text-indigo-500 font-semibold">{currentGroup.name}</strong> 그룹에서 멤버들이 획득한 보너스 포인트가 0P로 리셋됩니다.
                        <br />
                        운동 인증 기록 및 벌금 내역은 그대로 유지됩니다.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={isProcessing}
                    onClick={() => setManageConfirmAction(null)}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold border border-[var(--hf-border)] text-[var(--hf-text-secondary)] hover:bg-black/5 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={
                      manageConfirmAction === "delete"
                        ? handleDeleteGroup
                        : manageConfirmAction === "reset"
                        ? handleResetGroup
                        : manageConfirmAction === "reset_penalties"
                        ? handleResetPenalties
                        : handleResetPoints
                    }
                    className={`flex-1 py-3 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md ${
                      manageConfirmAction === "delete"
                        ? "bg-rose-500 hover:bg-rose-600"
                        : manageConfirmAction === "reset"
                        ? "bg-amber-500 hover:bg-amber-600"
                        : manageConfirmAction === "reset_penalties"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>처리 중...</span>
                      </>
                    ) : manageConfirmAction === "delete" ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>영구 삭제</span>
                      </>
                    ) : manageConfirmAction === "reset" ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>전체 초기화</span>
                      </>
                    ) : manageConfirmAction === "reset_penalties" ? (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        <span>벌금 초기화</span>
                      </>
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5" />
                        <span>포인트 초기화</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Action Choices View */
              <div className="space-y-3">
                {/* Action 1: Reset Penalties Only */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:border-emerald-500/40"
                  style={{
                    background: "rgba(16, 185, 129, 0.05)",
                    borderColor: "rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-600 shrink-0 mt-0.5">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--hf-text-primary)]">
                        벌금만 초기화
                      </h4>
                      <p className="text-xs text-[var(--hf-text-muted)] mt-1 leading-relaxed">
                        운동 기록과 포인트는 유지하고, 그룹 내 모든 주간 벌금 내역만 0원으로 리셋합니다.
                      </p>
                      <button
                        onClick={() => setManageConfirmAction("reset_penalties")}
                        className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs"
                      >
                        벌금 초기화
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action 2: Reset Points Only */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:border-indigo-500/40"
                  style={{
                    background: "rgba(99, 102, 241, 0.05)",
                    borderColor: "rgba(99, 102, 241, 0.2)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/15 text-indigo-600 shrink-0 mt-0.5">
                      <Star className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--hf-text-primary)]">
                        포인트만 초기화
                      </h4>
                      <p className="text-xs text-[var(--hf-text-muted)] mt-1 leading-relaxed">
                        운동 기록과 벌금은 유지하고, 그룹에서 획득한 보너스 포인트만 0P로 리셋합니다.
                      </p>
                      <button
                        onClick={() => setManageConfirmAction("reset_points")}
                        className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-xs"
                      >
                        포인트 초기화
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action 3: Reset Group */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:border-amber-500/40"
                  style={{
                    background: "rgba(245, 158, 11, 0.05)",
                    borderColor: "rgba(245, 158, 11, 0.2)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-600 shrink-0 mt-0.5">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--hf-text-primary)]">
                        그룹 전체 초기화
                      </h4>
                      <p className="text-xs text-[var(--hf-text-muted)] mt-1 leading-relaxed">
                        멤버 구성은 유지하고, 이번 시즌 운동 인증 기록과 주간 정산 내역을 0건으로 리셋합니다.
                      </p>
                      <button
                        onClick={() => setManageConfirmAction("reset")}
                        className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-xs"
                      >
                        기록 초기화
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action 4: Delete Group */}
                <div
                  className="p-4 rounded-2xl border transition-all hover:border-rose-500/40"
                  style={{
                    background: "rgba(239, 68, 68, 0.05)",
                    borderColor: "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-600 shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        그룹 완전 삭제
                      </h4>
                      <p className="text-xs text-[var(--hf-text-muted)] mt-1 leading-relaxed">
                        그룹을 완전히 해체하고 삭제합니다. 모든 멤버가 해산되며 모든 데이터가 영구 삭제됩니다.
                      </p>
                      <button
                        onClick={() => setManageConfirmAction("delete")}
                        className="mt-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-xs"
                      >
                        그룹 삭제
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Double-back Exit Toast Notification */}
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up pointer-events-none w-max max-w-[90vw]">
          <div className="px-5 py-3 rounded-full bg-black/90 dark:bg-white/95 text-white dark:text-black text-xs font-semibold backdrop-blur-md shadow-2xl flex items-center gap-2 border border-white/10 dark:border-black/10">
            <span>'뒤로' 버튼을 한 번 더 누르면 종료됩니다</span>
          </div>
        </div>
      )}
    </main>
  );
}

/* ===== Tab Item ===== */

function TabItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 py-2 px-6 transition-colors"
      style={{
        color: active ? "var(--hf-primary)" : "var(--hf-text-muted)",
      }}
    >
      <div className={`${active ? "scale-110" : ""} transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
