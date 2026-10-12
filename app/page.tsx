'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RotateCcw, 
  AlertTriangle, 
  X, 
  Send 
} from 'lucide-react';
import { TestCase } from '@/types/testCase';
import TcGeneratorCard from '@/components/TcGeneratorCard';
import ReleaseBoardCard from '@/components/ReleaseBoardCard';

export default function Home() {
  // CRITICAL REQUIREMENT 1: LIFT STATE UP
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

  // 대시보드 리셋 핸들러
  const handleResetDashboard = () => {
    if (confirm('대시보드를 초기화하시겠습니까? 업로드된 TC 및 상태가 초기화됩니다.')) {
      setTcList([]);
      setIsBlocked(false);
      setShowWarningModal(false);
      setToastMessage(null);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isBlocked ? 'bg-red-50/40' : 'bg-slate-50'}`}>
      {/* 헤더 네비게이션 */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-20 border-slate-200">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg text-white shadow-sm ${isBlocked ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Q-Safe (Quality + Safe)
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Dashboard
            </button>
          </div>
        </div>
      </header>

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
              onUpdateTcList={setTcList}
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
    </div>
  );
}
