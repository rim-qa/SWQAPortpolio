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
    if (activeBlockers === 0 && isBlocked) {
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
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isBlocked && currentView === 'dashboard' ? 'bg-red-50/40' : 'bg-slate-50'}`}>
      {/* 글로벌 상단 헤더 네비게이션 */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-20 border-slate-200">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg text-white shadow-sm ${isBlocked && currentView === 'dashboard' ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Q-Safe
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500">
                실제 CSV 파싱 기반 AI TC 자동 생성기 및 실시간 릴리즈 대시보드
              </p>
            </div>
          </div>

          {/* 오른쪽 상단 탭: 1번째 홈 탭, 2번째 Q-Safe 대시보드 탭 */}
          <div className="flex items-center gap-2">
            {/* 1번째: 홈 탭 */}
            <button
              type="button"
              onClick={() => setCurrentView('portal')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                currentView === 'portal'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>홈</span>
            </button>

            {/* 2번째: Q-Safe 대시보드 탭 */}
            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Q-Safe 대시보드</span>
            </button>

            {/* 대시보드 뷰일 때 리셋 버튼 표시 */}
            {currentView === 'dashboard' && (
              <button
                type="button"
                disabled={tcList.length === 0}
                onClick={handleResetDashboard}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ml-1 ${
                  tcList.length === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 shadow-none'
                    : 'text-slate-600 bg-white hover:bg-slate-100 border-slate-300 shadow-sm cursor-pointer'
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
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              SW QA 업무 도구함
            </h1>
            <p className="text-slate-500 text-base sm:text-lg mt-3 font-normal">
              업무 효율을 높여주는 사내 자동화 도구 모음입니다.
            </p>
          </div>

          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-blue-100/70 border border-blue-200/50 flex items-center justify-center shadow-2xs">
                <div className="relative flex items-center justify-center">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
                      fill="url(#shield-grad)" 
                      stroke="#2563eb" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <defs>
                      <linearGradient id="shield-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#60a5fa" />
                        <stop offset="1" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Active Tool
              </span>
            </div>

            <div className="mt-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2.5 tracking-tight">
                Q-Safe 대시보드
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                실제 CSV 파싱 기반 AI TC 자동 생성 및 실시간 릴리즈 대시보드를 제공합니다. 테스트 현황을 한눈에 파악하세요.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('dashboard')}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-base rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl border border-slate-700 animate-bounce">
          <Send className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 치명적 결함 모달 */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Critical Defect Found!</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              <strong>Testing Halted &amp; Hotfix Required</strong>
              <br />
              치명적 결함(Blocker)이 감지되어 배포 파이프라인 및 테스트 절차가 긴급 중단되었습니다.
              슬랙으로 핫픽스 요청이 전파되었습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleResolveIssue}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
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
