'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RotateCcw, 
  AlertTriangle, 
  X, 
  Send, 
  ArrowRight,
  Home as HomeIcon,
  LayoutDashboard
} from 'lucide-react';
import { TestCase } from '@/types/testCase';
import TcGeneratorCard from '@/components/TcGeneratorCard';
import ReleaseBoardCard from '@/components/ReleaseBoardCard';

export default function Home() {
  // CRITICAL REQUIREMENT 1: LIFT STATE UP
  const [currentView, setCurrentView] = useState<'portal' | 'dashboard'>('portal');
  const [tcList, setTcList] = useState<TestCase[]>([]);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 긴급 Blocker 트리거 핸들러
  const handleTriggerBlocker = () => {
    setIsBlocked(true);
    setShowWarningModal(true);
    setToastMessage('[Slack] Hotfix request broadcasted.');
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // 긴급 상황 해제 핸들러
  const handleResolveIssue = () => {
    setIsBlocked(false);
    setShowWarningModal(false);
  };

  // TC 리스트 업데이트 시 Blocker와 Critical이 모두 0개이면 isBlocked를 자동으로 해제
  const handleUpdateTcList = (newTcList: TestCase[]) => {
    setTcList(newTcList);
    const activeBlockers = newTcList.filter(
      (tc) => tc.status === 'Blocker' || (tc.priority === 'Critical' && tc.status === 'Fail')
    ).length;
    if (activeBlockers === 0) {
      setIsBlocked(false);
      setShowWarningModal(false);
    }
  };

  // 대시보드 리셋 핸들러
  const handleResetDashboard = () => {
    if (tcList.length === 0) return;
    if (confirm('대시보드를 초기화하시겠습니까? 업로드된 TC 및 상태가 초기화됩니다.')) {
      setTcList([]);
      setIsBlocked(false);
      setShowWarningModal(false);
      setToastMessage(null);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isBlocked && currentView === 'dashboard' ? 'bg-[#FFF0F4]/70' : 'bg-[#F6F1FD]'}`}>
      {/* 글로벌 상단 헤더 네비게이션 */}
      <header className="border-b bg-white/85 backdrop-blur-md sticky top-0 z-20 border-[#EBDDF9] shadow-xs">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl text-white shadow-md transition-all ${
              isBlocked && currentView === 'dashboard' 
                ? 'bg-rose-600 animate-pulse' 
                : 'bg-gradient-to-tr from-[#906FE7] to-[#C4B5FD] shadow-purple-200/60'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#2E1A47] flex items-center gap-1">
                  <span>Q-Safe</span>
                  <span className="text-sm text-[#8B5CF6]">✨</span>
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F3ECFB] text-[#7C3AED] font-bold border border-[#DDD0F5]">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-[#7B6891]">
                실제 CSV 파싱 기반 AI TC 자동 생성기 및 실시간 릴리즈 대시보드
              </p>
            </div>
          </div>

          {/* 오른쪽 상단 탭: 1번째 홈 탭, 2번째 Q-Safe 대시보드 탭 */}
          <div className="flex items-center gap-2">
            <div className="bg-[#F1E8FB] p-1 rounded-2xl border border-[#E3D3F7] flex items-center gap-1">
              {/* 1번째: 홈 탭 */}
              <button
                type="button"
                onClick={() => setCurrentView('portal')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  currentView === 'portal'
                    ? 'bg-gradient-to-r from-[#9F7AEA] to-[#7C3AED] text-white shadow-md shadow-purple-200/60'
                    : 'text-[#7A6A8E] hover:text-[#2E1A47] hover:bg-white/60'
                }`}
              >
                <HomeIcon className="w-4 h-4" />
                <span>홈</span>
              </button>

              {/* 2번째: Q-Safe 대시보드 탭 */}
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-gradient-to-r from-[#9F7AEA] to-[#7C3AED] text-white shadow-md shadow-purple-200/60'
                    : 'text-[#7A6A8E] hover:text-[#2E1A47] hover:bg-white/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Q-Safe 대시보드</span>
              </button>
            </div>

            {/* 대시보드 뷰일 때 리셋 버튼 표시 */}
            {currentView === 'dashboard' && (
              <button
                type="button"
                disabled={tcList.length === 0}
                onClick={handleResetDashboard}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all ml-1 ${
                  tcList.length === 0
                    ? 'opacity-40 cursor-not-allowed bg-[#FAF7FD] text-[#AFA1BF] border-[#EBDDF9] shadow-none'
                    : 'text-[#6F5E82] bg-white hover:bg-[#F3ECFB] hover:text-[#7C3AED] border-[#DDD0F5] shadow-xs cursor-pointer'
                }`}
                title={tcList.length === 0 ? '초기화할 테스트 케이스가 없습니다' : '대시보드 초기화'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 뷰에 따른 본문 렌더링 */}
      {currentView === 'portal' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 py-12 md:py-20">
          <div className="text-center mb-8 sm:mb-10 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E1A47] tracking-tight flex items-center justify-center gap-2">
              <span>SW QA 업무 도구함</span>
              <span className="text-[#8B5CF6]">✨</span>
            </h1>
            <p className="text-[#7B6891] text-base sm:text-lg mt-3 font-normal">
              업무 효율을 높여주는 사내 자동화 도구 모음입니다.
            </p>
          </div>

          <div className="w-full max-w-[430px] bg-white rounded-3xl p-7 sm:p-8 border border-[#EADBF8] shadow-[0_15px_45px_rgba(180,150,230,0.18)] hover:shadow-[0_20px_55px_rgba(180,150,230,0.25)] transition-all">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#EDE4FA] to-[#FAF5FF] border border-[#DDD0F5] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-7 h-7 text-[#8B5CF6]" />
              </div>
              <span className="text-xs font-bold text-[#7C3AED] bg-[#F3ECFB] px-3 py-1 rounded-full border border-[#DDD0F5] shadow-2xs">
                Active Tool
              </span>
            </div>

            <div className="mt-6 mb-6">
              <h2 className="text-2xl font-bold text-[#2E1A47] mb-2.5 tracking-tight flex items-center gap-1.5">
                <span>Q-Safe 대시보드</span>
                <span className="text-sm text-[#8B5CF6]">✦</span>
              </h2>
              <p className="text-sm text-[#6F5E82] leading-relaxed">
                실제 CSV 파싱 기반 AI TC 자동 생성 및 실시간 릴리즈 대시보드를 제공합니다. 테스트 현황을 한눈에 파악하세요.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#9F7AEA] via-[#8B5CF6] to-[#7C3AED] hover:from-[#906BE0] hover:to-[#6D28D9] active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-lg shadow-purple-200/70 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>바로가기</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
        {/* 토스트 알림 */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#2D1B46] text-white px-4 py-3 rounded-2xl shadow-2xl border border-purple-900/50 animate-bounce">
            <Send className="w-4 h-4 text-[#D8B4FE]" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-purple-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 치명적 결함 모달 */}
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-400 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="p-2.5 bg-rose-100 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-bold text-lg text-[#2E1A47]">Critical Defect Found!</h3>
              </div>
              <p className="text-sm text-[#6F5E82] mb-5 leading-relaxed">
                <strong className="text-rose-600">Testing Halted &amp; Hotfix Required</strong>
                <br />
                치명적 결함(Blocker)이 감지되어 배포 파이프라인 및 테스트 절차가 긴급 중단되었습니다.
                슬랙으로 핫픽스 요청이 전파되었습니다.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-[#6F5E82] bg-[#F3ECFB] hover:bg-[#EBDDF9] rounded-xl cursor-pointer transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleResolveIssue}
                  className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl cursor-pointer shadow-md shadow-emerald-200 transition-all"
                >
                  상황 해제 (Resolve)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메인 2분할 레이아웃 (md:grid-cols-2) */}
        <main className="max-w-[1700px] mx-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Card 1: AI TC 자동 생성기 및 실행기 (7 cols) */}
            <div className="lg:col-span-7">
              <TcGeneratorCard
                tcList={tcList}
                onUpdateTcList={handleUpdateTcList}
                onTriggerBlocker={handleTriggerBlocker}
              />
            </div>

            {/* Card 2: 실시간 릴리즈 현황 및 긴급 제어 (5 cols) */}
            <div className="lg:col-span-5">
              <ReleaseBoardCard
                tcList={tcList}
                isBlocked={isBlocked}
                onTriggerBlocker={handleTriggerBlocker}
                onResolveIssue={handleResolveIssue}
              />
            </div>
          </div>
        </main>
        </>
      )}
    </div>
  );
}
