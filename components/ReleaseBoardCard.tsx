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

  // 실행 완료 건수: PASS + Fail + Blocker + Recommend (테스트 검증 완료 및 개선 제안 분류)
  const executedCount = passCount + failCount + blockerCount + recommendCount;
  const progressPercent = totalCount > 0 ? Math.round((executedCount / totalCount) * 100) : 0;
  
  // 합격률 (PASS 건수 / 실제 기능 판정 완료 대상)
  const passRate = executedCount > 0 ? Math.round((passCount / executedCount) * 100) : 0;

  /**
   * 긴급 상황(isCriticalEmergency)은:
   * 1) 수동으로 Blocker 버튼을 눌렀을 때(isBlocked === true)
   * 2) 실제로 Blocker 상태인 TC가 있을 때(blockerCount > 0)
   * 3) 미해결된 결함 중 Critical 우선순위가 있을 때(criticalCount > 0)
   */
  const isCriticalEmergency = isBlocked || blockerCount > 0 || criticalCount > 0;

  // 릴리즈 판정 로직
  const getReleaseDecision = () => {
    if (totalCount === 0) {
      return {
        status: 'READY',
        title: '요구사항 로드 대기',
        description: 'CSV 요구사항을 업로드하여 테스트 케이스를 생성하세요.',
        badgeColor: 'bg-[#F3ECFB] text-[#7C3AED] border-[#DDD0F5]',
        textColor: 'text-[#6F5E82]',
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
      if (passCount < 2) {
        return {
          status: 'HOLD / PASS REQUIRED',
          title: '⚠️ PASS 테스트케이스 최소 2개 필요 (릴리즈 보류)',
          description: `현재 개선사항(Recommend) ${recommendCount}건만 등록/완료되어 실제 핵심 기능의 정상 동작 검증(PASS)이 부족합니다. 안전한 릴리즈 승인을 위해 최소 2개 이상의 PASS 테스트케이스가 필요합니다.`,
          badgeColor: 'bg-amber-500 text-white font-extrabold shadow-xs',
          textColor: 'text-amber-800',
        };
      }

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
      badgeColor: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
      textColor: 'text-[#6D28D9]',
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
• 실행 결과: PASS ${passCount}건 (합격률 ${passRate}%), Fail ${failCount}건, Blocker ${blockerCount}건, Recommend ${recommendCount}건, Pending ${pendingCount}건, N/A ${naCount}건
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

  // [요구사항 4] 카드2 릴리즈 리포트 및 전체 TC 상세 CSV 다운로드 기능
  const handleDownloadReportCsv = () => {
    if (totalCount === 0) {
      alert('다운로드할 테스트 결과 데이터가 없습니다.');
      return;
    }

    const sanitizeText = (str: string) => {
      if (!str) return '';
      return str
        .replace(/🚨/g, '[긴급] ')
        .replace(/⚠️/g, '[경고] ')
        .replace(/🎉/g, '[승인] ')
        .replace(/🔄/g, '[진행중] ')
        .replace(/✨/g, '')
        .replace(/✦/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();
    };

    // [섹션 1] 릴리즈 최종 판정 및 지표 종합 요약
    const summaryHeader = ['구분', '지표 항목', '수치 / 상태', '상세 설명 및 비고'];
    const summaryRows = [
      ['릴리즈 의사결정', '최종 판정 상태', decision.status, sanitizeText(decision.title)],
      ['릴리즈 의사결정', '의사결정 상세 사유', decision.status, sanitizeText(decision.description)],
      ['테스트 진행률', '전체 검증 진행률', `${progressPercent}%`, `실행 완료 ${executedCount}건 / 총 ${totalCount}건 (대기: ${pendingCount}건)`],
      ['핵심 메트릭', '전체 생성 TC', `${totalCount}건`, '100% 검증 대상'],
      ['핵심 메트릭', 'PASS (검증 통과)', `${passCount}건`, `합격률 ${passRate}%`],
      ['핵심 메트릭', 'Fail (기능 결함)', `${failCount}건`, '일반 기능 결함 발견'],
      ['핵심 메트릭', 'Blocker (치명 결함)', `${blockerCount}건`, blockerCount > 0 ? '치명적 결함 (배포 즉각 차단 및 긴급 핫픽스 요망)' : '위험 없음'],
      ['핵심 메트릭', 'Pending (검증 대기)', `${pendingCount}건`, '미실행 테스트 케이스'],
      ['핵심 메트릭', 'N/A (범위 제외)', `${naCount}건`, '테스트 대상 제외'],
      ['결함 우선순위', 'Critical (치명 결함)', `${criticalCount}건`, `긴급 핫픽스 요망 (전체 등록 ${totalCritical}건 중)`],
      ['결함 우선순위', 'Major (주요 결함)', `${majorCount}건`, `주요 기능 결함 (전체 등록 ${totalMajor}건 중)`],
      ['결함 우선순위', 'Minor (경미 결함)', `${minorCount}건`, `경미한 UI/기능 결함 (전체 등록 ${totalMinor}건 중)`],
      ['개선 권장', 'Recommend (개선사항)', `${recommendCount}건`, `개선 권장 제안 (전체 등록 ${totalRecommend}건 중)`],
    ];

    // [섹션 2] 모듈 / 카테고리별 실시간 검증 현황
    const categoryHeader = ['모듈 (카테고리명)', '검증 완료 건수', '전체 TC 건수', '진행률 (%)', 'Blocker 위험 여부'];
    const categoryRows = categories.map((cat) => {
      const catTcs = tcList.filter((t) => t.category === cat);
      const catTotal = catTcs.length;
      const catDone = catTcs.filter((t) => ['PASS', 'Fail', 'Blocker', 'Recommend'].includes(t.status)).length;
      const catBlocked = catTcs.some((t) => t.status === 'Blocker');
      const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
      return [
        cat,
        `${catDone}건`,
        `${catTotal}건`,
        `${catPct}%`,
        catBlocked ? 'Blocker 발생 (배포 차단)' : '정상'
      ];
    });

    // [섹션 3] 전체 테스트 케이스 상세 실행 내역 (화면 좌측 카드1의 전체 데이터)
    const tcDetailHeader = [
      'TC-ID',
      '요구사항 ID',
      '대분류 (카테고리)',
      '기능명',
      '테스트 유형',
      '테스트 항목 (제목)',
      '사전 조건',
      '재현 절차',
      '기대 결과',
      '실제 결과 (자동 판정)',
      '검증 상태',
      '결함 우선순위'
    ];
    const tcDetailRows = tcList.map((tc) => [
      tc.id,
      tc.reqId,
      tc.category,
      tc.featureName,
      tc.type,
      tc.testItem,
      tc.preconditions || '',
      tc.steps || '',
      tc.expected || '',
      tc.actual || '',
      tc.status,
      tc.priority
    ]);

    const formatRow = (row: string[]) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',');

    const csvLines = [
      '=== [1] Q-Safe 릴리즈 현황 및 최종 의사결정 요약 ===',
      formatRow(summaryHeader),
      ...summaryRows.map(formatRow),
      '',
      '=== [2] 모듈 / 카테고리별 실시간 검증 현황 ===',
      formatRow(categoryHeader),
      ...categoryRows.map(formatRow),
      '',
      `=== [3] 전체 테스트 케이스 상세 실행 결과 내역 (총 ${tcList.length}건) ===`,
      formatRow(tcDetailHeader),
      ...tcDetailRows.map(formatRow),
    ];

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
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
      className={`rounded-3xl border transition-all duration-300 shadow-[0_12px_40px_rgba(180,150,230,0.15)] flex flex-col h-full overflow-hidden ${
        isCriticalEmergency
          ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-400'
          : 'bg-white border-[#EADBF8]'
      }`}
    >
      {/* 카드 상단 헤더 */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-2.5 transition-colors ${
          isCriticalEmergency ? 'border-rose-200 bg-rose-100/70' : 'border-[#ECE0F9] bg-gradient-to-r from-[#FAF6FD] to-[#F3ECFB]'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-2xl text-white shadow-sm transition-colors ${
              isCriticalEmergency ? 'bg-rose-600 animate-pulse' : 'bg-gradient-to-tr from-[#906FE7] to-[#C4B5FD] shadow-purple-200/50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-[#2E1A47] text-base md:text-lg flex items-center gap-2">
              <span>실시간 릴리즈 현황 및 긴급 제어</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                  isCriticalEmergency
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-[#F3ECFB] text-[#7C3AED] border border-[#DDD0F5]'
                }`}
              >
                Card 2
              </span>
            </h2>
            <p className="text-xs text-[#7B6891]">
              실시간 릴리즈 판정 • 결함 우선순위 분석 • 공유 리포트 내보내기
            </p>
          </div>
        </div>

        {/* 공유 복사 / CSV 다운로드 / 상황 제어 버튼 그룹 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 복사 버튼 */}
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#6F5E82] hover:text-[#7C3AED] bg-white hover:bg-[#F3ECFB] border border-[#DDD0F5] rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="릴리즈 요약 텍스트 클립보드 복사"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>요약 복사</span>
              </>
            )}
          </button>

          {/* CSV 다운로드 버튼 */}
          <button
            type="button"
            onClick={handleDownloadReportCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#6F5E82] hover:text-[#7C3AED] bg-white hover:bg-[#F3ECFB] border border-[#DDD0F5] rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="릴리즈 현황 CSV 리포트 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>CSV 저장</span>
          </button>

          {/* 긴급 제어 버튼 */}
          {isCriticalEmergency ? (
            <button
              type="button"
              onClick={onResolveIssue}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-sm transition-all cursor-pointer hover:shadow"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              상황 해제
            </button>
          ) : (
            <button
              type="button"
              onClick={onTriggerBlocker}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 rounded-xl shadow-md shadow-rose-300/50 transition-all cursor-pointer hover:shadow"
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
        <div className={`p-4 rounded-2xl border transition-all ${
          isCriticalEmergency 
            ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-400' 
            : decision.status.includes('WARNING') || decision.status.includes('HOLD')
            ? 'bg-[#FFF9EB] border-[#FDE68A] ring-1 ring-amber-200'
            : decision.status === 'PASS'
            ? 'bg-[#F0FDF4] border-emerald-300 ring-1 ring-emerald-200'
            : 'bg-[#FAF7FD] border-[#E8DCF7]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#2E1A47] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8B5CF6]" />
              최종 릴리즈 의사결정 상태
            </span>
            <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wide border shadow-2xs ${decision.badgeColor}`}>
              {decision.status}
            </span>
          </div>
          <div className={`font-black text-base flex items-center gap-1.5 ${decision.textColor}`}>
            {decision.title}
          </div>
          <p className="text-xs text-[#6F5E82] mt-1.5 leading-relaxed font-medium">
            {decision.description}
          </p>
        </div>

        {/* 3. 결함 우선순위(Critical / Major / Minor / Recommend) 개수 현황 바 */}
        <div className="bg-[#FAF7FD] p-4 rounded-2xl border border-[#E8DCF7] space-y-2.5 shadow-2xs">
          <div className="flex justify-between items-center text-xs font-bold text-[#2E1A47]">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#8B5CF6]" />
              결함 우선순위 분포 (Priority Breakdown)
            </span>
            <span className="text-[11px] text-[#AFA1BF] font-normal">
              Fail/Blocker {failCount + blockerCount}건 분석
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Critical */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              criticalCount > 0 ? 'bg-rose-100/90 border-rose-300 ring-1 ring-rose-300 shadow-xs' : 'bg-white border-[#EADBF8]'
            }`}>
              <div className="text-[11px] font-bold text-rose-700 flex items-center justify-center gap-0.5">
                Critical
              </div>
              <div className="text-xl font-black text-rose-700 mt-0.5">{criticalCount}</div>
              <div className="text-[9px] text-[#AFA1BF]">전체 {totalCritical}건</div>
            </div>

            {/* Major */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              majorCount > 0 ? 'bg-orange-50/90 border-orange-200 shadow-xs' : 'bg-white border-[#EADBF8]'
            }`}>
              <div className="text-[11px] font-bold text-orange-700">Major</div>
              <div className="text-xl font-black text-orange-800 mt-0.5">{majorCount}</div>
              <div className="text-[9px] text-[#AFA1BF]">전체 {totalMajor}건</div>
            </div>

            {/* Minor */}
            <div className={`p-2.5 rounded-2xl border transition-all ${
              minorCount > 0 ? 'bg-blue-50/90 border-blue-200 shadow-xs' : 'bg-white border-[#EADBF8]'
            }`}>
              <div className="text-[11px] font-bold text-blue-700">Minor</div>
              <div className="text-xl font-black text-blue-800 mt-0.5">{minorCount}</div>
              <div className="text-[9px] text-[#AFA1BF]">전체 {totalMinor}건</div>
            </div>

            {/* Recommend */}
            <div className="p-2.5 rounded-2xl border bg-white border-[#EADBF8] shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-700">Recommend</div>
              <div className="text-xl font-black text-emerald-800 mt-0.5">{recommendCount}</div>
              <div className="text-[9px] text-[#AFA1BF]">개선권장</div>
            </div>
          </div>
        </div>

        {/* 4. 실시간 진행률 프로그레스 바 */}
        <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-[#E8DCF7] shadow-2xs">
          <div className="flex justify-between items-center text-sm font-semibold text-[#2E1A47]">
            <span className="flex items-center gap-1.5 text-xs md:text-sm">
              <Radio className={`w-4 h-4 ${
                isCriticalEmergency 
                  ? 'text-rose-600 animate-ping' 
                  : failCount > 0 
                  ? 'text-amber-500 animate-pulse' 
                  : 'text-[#8B5CF6] animate-pulse'
              }`} />
              <span className="font-bold">전체 테스트 진행률</span>
              <span className="text-[11px] text-[#AFA1BF] font-normal">
                ((P+F+B+R)/Total)
              </span>
            </span>
            <span className="text-2xl md:text-3xl font-black text-[#8B5CF6]">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-4 bg-[#F1E8FB] rounded-full overflow-hidden p-0.5 border border-[#E3D3F7]">
            <div
              className={`h-full transition-all duration-500 rounded-full shadow-inner ${
                isCriticalEmergency 
                  ? 'bg-rose-600' 
                  : failCount > 0 
                  ? 'bg-gradient-to-r from-amber-400 to-rose-400' 
                  : 'bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-[#7C3AED]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-[#7B6891] pt-0.5">
            <span>실행 완료: <strong className="text-[#2E1A47]">{executedCount}</strong> / 총 <strong>{totalCount}</strong></span>
            <span>대기(Pending): <strong className="text-[#2E1A47]">{pendingCount}</strong></span>
          </div>
        </div>

        {/* 5. 통계 메트릭 6종 그리드 */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Total */}
          <div className="p-3 bg-[#FAF7FD] rounded-2xl border border-[#E8DCF7] shadow-2xs text-center">
            <div className="text-[11px] text-[#7B6891] font-bold">전체 TC</div>
            <div className="text-xl font-black text-[#2E1A47] mt-0.5">{totalCount}</div>
            <div className="text-[9px] text-[#AFA1BF]">100% 대상</div>
          </div>

          {/* PASS */}
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 shadow-2xs text-center">
            <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-0.5">
              <CheckCircle className="w-3 h-3" /> PASS
            </div>
            <div className="text-xl font-black text-emerald-800 mt-0.5">{passCount}</div>
            <div className="text-[9px] text-emerald-600 font-semibold">합격률 {passRate}%</div>
          </div>

          {/* Fail */}
          <div className="p-3 bg-[#FFEBF1]/80 rounded-2xl border border-[#FCD2DF] shadow-2xs text-center">
            <div className="text-[11px] text-rose-700 font-bold flex items-center justify-center gap-0.5">
              <XCircle className="w-3 h-3" /> Fail
            </div>
            <div className="text-xl font-black text-rose-800 mt-0.5">{failCount}</div>
            <div className="text-[9px] text-rose-600 font-semibold">결함 발견</div>
          </div>

          {/* Blocker */}
          <div className={`p-3 rounded-2xl border shadow-2xs text-center ${
            blockerCount > 0 ? 'bg-red-100 border-red-300 ring-1 ring-red-300' : 'bg-rose-50/50 border-rose-200'
          }`}>
            <div className="text-[11px] text-red-700 font-black flex items-center justify-center gap-0.5">
              <AlertOctagon className="w-3 h-3" /> Blocker
            </div>
            <div className="text-xl font-black text-red-700 mt-0.5">{blockerCount}</div>
            <div className="text-[9px] text-red-600 font-semibold">{blockerCount > 0 ? '핫픽스 요망' : '위험 없음'}</div>
          </div>

          {/* Pending */}
          <div className="p-3 bg-[#FFF9EB]/80 rounded-2xl border border-[#FDE68A] shadow-2xs text-center">
            <div className="text-[11px] text-amber-700 font-bold flex items-center justify-center gap-0.5">
              <Clock className="w-3 h-3" /> Pending
            </div>
            <div className="text-xl font-black text-amber-800 mt-0.5">{pendingCount}</div>
            <div className="text-[9px] text-amber-600 font-medium">미실행</div>
          </div>

          {/* N/A */}
          <div className="p-3 bg-[#F5F2F7] rounded-2xl border border-[#E4DEEB] shadow-2xs text-center">
            <div className="text-[11px] text-stone-500 font-bold">N/A</div>
            <div className="text-xl font-black text-stone-700 mt-0.5">{naCount}</div>
            <div className="text-[9px] text-stone-400 font-medium">범위제외</div>
          </div>
        </div>

        {/* 6. 카테고리별 실시간 검증 현황 미니바 */}
        {categories.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-[#E8DCF7] shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#2E1A47]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />
                모듈/카테고리별 실시간 검증 현황
              </span>
              <span className="text-[10px] text-[#AFA1BF]">상위 {categories.length}개</span>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => {
                const catTcs = tcList.filter((t) => t.category === cat);
                const catTotal = catTcs.length;
                const catDone = catTcs.filter((t) => ['PASS', 'Fail', 'Blocker', 'Recommend'].includes(t.status)).length;
                const catBlocked = catTcs.some((t) => t.status === 'Blocker');
                const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#7B6891]">
                      <span className="font-semibold text-[#2E1A47] flex items-center gap-1">
                        {cat}
                        {catBlocked && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded-full font-bold">
                            Blocker
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-[#8B5CF6]">{catDone}/{catTotal} ({catPct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#F1E8FB] rounded-full overflow-hidden p-0.5 border border-[#E3D3F7]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          catBlocked ? 'bg-rose-500' : 'bg-gradient-to-r from-[#A78BFA] to-[#7C3AED]'
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
