'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  AlertOctagon, 
  Clock, 
  Radio,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Copy,
  Download,
  Check,
  Flame,
  FileSpreadsheet
} from 'lucide-react';
import { TestCase } from '@/types/testCase';

interface ReleaseBoardCardProps {
  tcList: TestCase[];
  isBlocked: boolean;
  onTriggerBlocker: () => void;
  onResolveIssue: () => void;
}

export default function ReleaseBoardCard({
  tcList,
  isBlocked,
  onTriggerBlocker,
  onResolveIssue,
}: ReleaseBoardCardProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const totalCount = tcList.length;
  const passCount = tcList.filter((tc) => tc.status === 'PASS').length;
  const failCount = tcList.filter((tc) => tc.status === 'Fail').length;
  const blockerCount = tcList.filter((tc) => tc.status === 'Blocker').length;
  const pendingCount = tcList.filter((tc) => tc.status === 'Pending').length;
  const naCount = tcList.filter((tc) => tc.status === 'N/A').length;

  // 결함 우선순위별 건수 (실제 결함인 Fail / Blocker 대상)
  const criticalCount = tcList.filter(
    (tc) => tc.priority === 'Critical' && (tc.status === 'Fail' || tc.status === 'Blocker')
  ).length;
  const majorCount = tcList.filter(
    (tc) => tc.priority === 'Major' && (tc.status === 'Fail' || tc.status === 'Blocker')
  ).length;
  const minorCount = tcList.filter(
    (tc) => tc.priority === 'Minor' && (tc.status === 'Fail' || tc.status === 'Blocker')
  ).length;
  const recommendCount = tcList.filter(
    (tc) => tc.priority === 'Recommend' || tc.status === 'Recommend'
  ).length;

  // 전체 등록된 우선순위 총 건수 (참고용)
  const totalCritical = tcList.filter((tc) => tc.priority === 'Critical').length;
  const totalMajor = tcList.filter((tc) => tc.priority === 'Major').length;
  const totalMinor = tcList.filter((tc) => tc.priority === 'Minor').length;
  const totalRecommend = tcList.filter((tc) => tc.priority === 'Recommend').length;

  // PRD 공식: ((PASS + Fail + Blocker count) / Total TC count) * 100
  const executedCount = passCount + failCount + blockerCount;
  const progressPercent = totalCount > 0 ? Math.round((executedCount / totalCount) * 100) : 0;
  
  // 합격률
  const passRate = executedCount > 0 ? Math.round((passCount / executedCount) * 100) : 0;

  /**
   * [요구사항 1 반영] 
   * 긴급 상황(isCriticalEmergency)은:
   * 1) 수동으로 Blocker 버튼을 눌렀을 때(isBlocked === true)
   * 2) 실제로 Blocker 상태인 TC가 있을 때(blockerCount > 0)
   * 3) 미해결된 결함 중 Critical 우선순위가 있을 때(criticalCount > 0)
   * Fail이 Major 3건인 경우에는 일반 결함(WARNING)으로만 표기되어야 하며 긴급 배너는 미노출!
   */
  const isCriticalEmergency = isBlocked || blockerCount > 0 || criticalCount > 0;

  // 릴리즈 판정 로직
  const getReleaseDecision = () => {
    if (totalCount === 0) {
      return {
        status: 'READY',
        title: '요구사항 로드 대기',
        description: 'CSV 요구사항을 업로드하여 테스트 케이스를 생성하세요.',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
        textColor: 'text-slate-700',
      };
    }
    if (isCriticalEmergency) {
      return {
        status: 'CRITICAL / BLOCKED',
        title: criticalCount > 0 
          ? `🚨 긴급: 치명적 결함(Critical) ${criticalCount}건 발생 - 배포 즉시 차단`
          : '🚨 배포 즉각 중단 (Blocker 발생)',
        description: criticalCount > 0
          ? `우선순위 Critical 결함이 ${criticalCount}건 발견되어 시스템 릴리즈가 긴급 동결되었습니다. 즉각적인 핫픽스가 필요합니다.`
          : '치명적 결함으로 인해 릴리즈가 차단되었습니다. 핫픽스가 완료될 때까지 배포가 금지됩니다.',
        badgeColor: 'bg-red-600 text-white animate-pulse',
        textColor: 'text-red-700',
      };
    }
    if (failCount > 0) {
      return {
        status: 'WARNING / ACTION REQUIRED',
        title: `⚠️ 결함 수정 필요 (Fail ${failCount}건 발생)`,
        description: `현재 ${failCount}건의 일반 기능 결함(Major: ${majorCount}건, Minor: ${minorCount}건)이 발견되었습니다. 결함 해결 및 재검증 전까지 릴리즈 보류/조건부 상태입니다.`,
        badgeColor: 'bg-amber-500 text-white font-extrabold shadow-xs',
        textColor: 'text-amber-800',
      };
    }
    if (progressPercent === 100) {
      return {
        status: 'PASS',
        title: '🎉 릴리즈 승인 완료 (Release Ready)',
        description: '모든 테스트 케이스가 100% 통과되었습니다. 안전하게 프로덕션 배포가 가능합니다.',
        badgeColor: 'bg-emerald-600 text-white',
        textColor: 'text-emerald-700',
      };
    }
    return {
      status: 'PROGRESS',
      title: '🔄 테스트 검증 진행 중',
      description: `전체 ${totalCount}개 중 ${executedCount}개 실행 완료 (${100 - progressPercent}% 남음)`,
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      textColor: 'text-indigo-700',
    };
  };

  const decision = getReleaseDecision();

  // 상위 카테고리별 통계
  const categories = Array.from(new Set(tcList.map((t) => t.category))).slice(0, 5);

  // [요구사항 4] 텍스트 요약 복사 기능
  const handleCopySummary = async () => {
    const summaryText = `[Q-Safe 릴리즈 현황 보고서]
• 최종 의사결정: ${decision.status} - ${decision.title}
• 전체 테스트 진행률: ${progressPercent}% (${executedCount}/${totalCount} 실행 완료)
• 실행 결과: PASS ${passCount}건 (합격률 ${passRate}%), Fail ${failCount}건, Blocker ${blockerCount}건, Pending ${pendingCount}건, N/A ${naCount}건
• 결함 우선순위 현황: Critical ${criticalCount}건, Major ${majorCount}건, Minor ${minorCount}건, Recommend ${recommendCount}건
• 상세 내용: ${decision.description}`;

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('클립보드 복사 중 오류가 발생했습니다.');
    }
  };

  // [요구사항 4] 카드2 릴리즈 리포트 CSV 다운로드 기능
  const handleDownloadReportCsv = () => {
    if (totalCount === 0) {
      alert('다운로드할 테스트 결과 데이터가 없습니다.');
      return;
    }

    const headers = ['지표 항목', '수치', '비고'];
    const rows = [
      ['최종 의사결정 상태', decision.status, decision.title],
      ['전체 진행률', `${progressPercent}%`, `${executedCount}/${totalCount} 완료`],
      ['전체 생성 TC', String(totalCount), '100%'],
      ['PASS 건수', String(passCount), `합격률 ${passRate}%`],
      ['Fail 건수', String(failCount), '기능 결함'],
      ['Blocker 건수', String(blockerCount), '치명 결함'],
      ['Pending (대기)', String(pendingCount), '미실행'],
      ['N/A (범위제외)', String(naCount), '비대상'],
      ['결함 우선순위 - Critical', String(criticalCount), '긴급 핫픽스 요망'],
      ['결함 우선순위 - Major', String(majorCount), '주요 결함'],
      ['결함 우선순위 - Minor', String(minorCount), '경미 결함'],
      ['개선 권장 - Recommend', String(recommendCount), '개선 검토'],
    ];

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Q-Safe_릴리즈_현황_리포트_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-300 shadow-sm flex flex-col h-full overflow-hidden ${
        isCriticalEmergency
          ? 'bg-red-50 border-red-300 ring-2 ring-red-400'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* 카드 상단 헤더 */}
      <div
        className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-2.5 transition-colors ${
          isCriticalEmergency ? 'border-red-200 bg-red-100/70' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center space-x-2">
          <div
            className={`p-2 rounded-lg text-white shadow-sm transition-colors ${
              isCriticalEmergency ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2">
              실시간 릴리즈 현황 및 긴급 제어
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                  isCriticalEmergency
                    ? 'bg-red-200 text-red-900'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Card 2
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              실시간 릴리즈 판정 • 결함 우선순위 분석 • 공유 리포트 내보내기
            </p>
          </div>
        </div>

        {/* [요구사항 4] 공유 복사 / CSV 다운로드 / 상황 제어 버튼 그룹 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 복사 버튼 */}
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="릴리즈 요약 텍스트 클립보드 복사"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>요약 복사</span>
              </>
            )}
          </button>

          {/* CSV 다운로드 버튼 */}
          <button
            type="button"
            onClick={handleDownloadReportCsv}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="릴리즈 현황 CSV 리포트 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV 저장</span>
          </button>

          {/* 긴급 제어 버튼 */}
          {isCriticalEmergency ? (
            <button
              type="button"
              onClick={onResolveIssue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer hover:shadow"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              상황 해제
            </button>
          ) : (
            <button
              type="button"
              onClick={onTriggerBlocker}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer hover:shadow"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              🚨 긴급 Blocker
            </button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* 1. 긴급 상태 배너 (Critical 결함 또는 Blocker 발생 시에만 노출) */}
        {isCriticalEmergency && (
          <div className="p-3.5 bg-red-600 text-white rounded-xl flex items-start gap-3 shadow-md animate-pulse">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-extrabold text-sm tracking-wide flex items-center gap-2">
                <span>CRITICAL DEFECT DETECTED</span>
                <span className="text-[10px] bg-white text-red-700 px-1.5 py-0.5 rounded font-black">
                  TESTING HALTED
                </span>
              </div>
              <div className="text-xs text-red-100 mt-1 leading-relaxed">
                {criticalCount > 0 
                  ? `치명적 결함(Critical) ${criticalCount}건 발생으로 인해 배포 파이프라인이 전면 동결되었습니다.`
                  : '치명적 결함(Blocker) 감지로 배포가 전면 동결되었습니다.'}
                {' '}Slack으로 핫픽스 요청이 전파되었으며, 버그 해결 후 상단의 <strong>[상황 해제]</strong> 버튼을 누르면 복구됩니다.
              </div>
            </div>
          </div>
        )}

        {/* 2. 릴리즈 판단 서머리 카드 */}
        <div className={`p-4 rounded-xl border transition-all ${
          isCriticalEmergency 
            ? 'bg-red-50/70 border-red-300 ring-1 ring-red-300' 
            : decision.status.includes('WARNING')
            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
            : decision.status === 'PASS'
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              최종 릴리즈 의사결정 상태
            </span>
            <span className={`text-[11px] px-3 py-1 rounded-full font-extrabold uppercase tracking-wide border ${decision.badgeColor}`}>
              {decision.status}
            </span>
          </div>
          <div className={`font-black text-base flex items-center gap-1.5 ${decision.textColor}`}>
            {decision.title}
          </div>
          <p className="text-xs text-slate-700 mt-1.5 leading-relaxed font-medium">
            {decision.description}
          </p>
        </div>

        {/* 3. [요구사항 3] 결함 우선순위(Critical / Major / Minor / Recommend) 개수 현황 바 */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              결함 우선순위 분포 (Priority Breakdown)
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Fail/Blocker {failCount + blockerCount}건 분석
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Critical */}
            <div className={`p-2 rounded-lg border transition-colors ${
              criticalCount > 0 ? 'bg-red-100/80 border-red-300 ring-1 ring-red-300' : 'bg-white border-slate-200'
            }`}>
              <div className="text-[11px] font-bold text-red-700 flex items-center justify-center gap-0.5">
                Critical
              </div>
              <div className="text-xl font-black text-red-700 mt-0.5">{criticalCount}</div>
              <div className="text-[9px] text-slate-400">전체 {totalCritical}건</div>
            </div>

            {/* Major */}
            <div className={`p-2 rounded-lg border transition-colors ${
              majorCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
            }`}>
              <div className="text-[11px] font-bold text-orange-700">Major</div>
              <div className="text-xl font-black text-orange-800 mt-0.5">{majorCount}</div>
              <div className="text-[9px] text-slate-400">전체 {totalMajor}건</div>
            </div>

            {/* Minor */}
            <div className={`p-2 rounded-lg border transition-colors ${
              minorCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'
            }`}>
              <div className="text-[11px] font-bold text-blue-700">Minor</div>
              <div className="text-xl font-black text-blue-800 mt-0.5">{minorCount}</div>
              <div className="text-[9px] text-slate-400">전체 {totalMinor}건</div>
            </div>

            {/* Recommend */}
            <div className="p-2 rounded-lg border bg-white border-slate-200">
              <div className="text-[11px] font-bold text-emerald-700">Recommend</div>
              <div className="text-xl font-black text-emerald-800 mt-0.5">{recommendCount}</div>
              <div className="text-[9px] text-slate-400">개선권장</div>
            </div>
          </div>
        </div>

        {/* 4. 실시간 진행률 프로그레스 바 */}
        <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
            <span className="flex items-center gap-1.5 text-xs md:text-sm">
              <Radio className={`w-4 h-4 ${
                isCriticalEmergency 
                  ? 'text-red-600 animate-ping' 
                  : failCount > 0 
                  ? 'text-amber-500 animate-pulse' 
                  : 'text-emerald-500 animate-pulse'
              }`} />
              전체 테스트 진행률
              <span className="text-[11px] text-slate-400 font-normal">
                ((P+F+B)/Total)
              </span>
            </span>
            <span className={`text-xl md:text-2xl font-black ${
              isCriticalEmergency ? 'text-red-600' : failCount > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full shadow-inner ${
                isCriticalEmergency 
                  ? 'bg-red-600' 
                  : failCount > 0 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
            <span>실행 완료: <strong>{executedCount}</strong> / 총 <strong>{totalCount}</strong></span>
            <span>대기(Pending): <strong>{pendingCount}</strong></span>
          </div>
        </div>

        {/* 5. 통계 메트릭 6종 그리드 */}
        <div className="grid grid-cols-3 gap-2">
          {/* Total */}
          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-center">
            <div className="text-[11px] text-slate-500 font-medium">전체 TC</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{totalCount}</div>
            <div className="text-[9px] text-slate-400">100% 대상</div>
          </div>

          {/* PASS */}
          <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 shadow-2xs text-center">
            <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-0.5">
              <CheckCircle className="w-3 h-3" /> PASS
            </div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">{passCount}</div>
            <div className="text-[9px] text-emerald-600">합격률 {passRate}%</div>
          </div>

          {/* Fail */}
          <div className="p-2.5 bg-rose-50/70 rounded-lg border border-rose-200 shadow-2xs text-center">
            <div className="text-[11px] text-rose-700 font-bold flex items-center justify-center gap-0.5">
              <XCircle className="w-3 h-3" /> Fail
            </div>
            <div className="text-xl font-black text-rose-800 mt-0.5">{failCount}</div>
            <div className="text-[9px] text-rose-600">결함 발견</div>
          </div>

          {/* Blocker */}
          <div className={`p-2.5 rounded-lg border shadow-2xs text-center ${
            blockerCount > 0 ? 'bg-red-100 border-red-400 ring-1 ring-red-400' : 'bg-red-50/50 border-red-200'
          }`}>
            <div className="text-[11px] text-red-700 font-black flex items-center justify-center gap-0.5">
              <AlertOctagon className="w-3 h-3" /> Blocker
            </div>
            <div className="text-xl font-black text-red-700 mt-0.5">{blockerCount}</div>
            <div className="text-[9px] text-red-600">{blockerCount > 0 ? '핫픽스 요망' : '위험 없음'}</div>
          </div>

          {/* Pending */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 shadow-2xs text-center">
            <div className="text-[11px] text-slate-600 font-medium flex items-center justify-center gap-0.5">
              <Clock className="w-3 h-3" /> Pending
            </div>
            <div className="text-xl font-black text-slate-700 mt-0.5">{pendingCount}</div>
            <div className="text-[9px] text-slate-400">미실행</div>
          </div>

          {/* N/A */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 shadow-2xs text-center">
            <div className="text-[11px] text-slate-500 font-medium">N/A</div>
            <div className="text-xl font-black text-slate-600 mt-0.5">{naCount}</div>
            <div className="text-[9px] text-slate-400">범위제외</div>
          </div>
        </div>

        {/* 6. 카테고리별 실시간 검증 현황 미니바 */}
        {categories.length > 0 && (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                모듈/카테고리별 실시간 검증 현황
              </span>
              <span className="text-[10px] text-slate-400">상위 {categories.length}개</span>
            </div>
            <div className="space-y-1.5">
              {categories.map((cat) => {
                const catTcs = tcList.filter((t) => t.category === cat);
                const catTotal = catTcs.length;
                const catDone = catTcs.filter((t) => ['PASS', 'Fail', 'Blocker'].includes(t.status)).length;
                const catBlocked = catTcs.some((t) => t.status === 'Blocker');
                const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;

                return (
                  <div key={cat} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        {cat}
                        {catBlocked && (
                          <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">
                            Blocker
                          </span>
                        )}
                      </span>
                      <span>{catDone}/{catTotal} ({catPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          catBlocked ? 'bg-red-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${catPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
