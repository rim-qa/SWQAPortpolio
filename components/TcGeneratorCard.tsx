'use client';

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertOctagon, 
  Filter, 
  Search, 
  Sparkles, 
  Trash2, 
  Edit, 
  CheckSquare, 
  Save, 
  X, 
  FileCheck, 
  ChevronDown,
  Link2,
  Maximize2,
  Minimize2,
  ChevronRight,
  Zap
} from 'lucide-react';
import { TestCase, TCStatus, TCPriority } from '@/types/testCase';
import { generateTestCasesFromRequirements, RawRequirementRow } from '@/lib/tcGenerator';

interface TcGeneratorCardProps {
  tcList: TestCase[];
  onUpdateTcList: (newTcList: TestCase[]) => void;
  onTriggerBlocker: () => void;
}

export default function TcGeneratorCard({
  tcList,
  onUpdateTcList,
  onTriggerBlocker,
}: TcGeneratorCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  
  // 1. 전체 필드 통합 검색창 및 상태 필터
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 체크박스 선택 상태 (ID 집합)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 수정 모달 대상
  const [editingTc, setEditingTc] = useState<TestCase | null>(null);

  // 샘플 데이터 선택 드롭다운 상태
  const [showSampleDropdown, setShowSampleDropdown] = useState<boolean>(false);

  // [요구사항 2 개선] 테이블 텍스트 펼치기/접기 모드 (기본: 요약형 컴팩트 뷰)
  const [isExpandedAll, setIsExpandedAll] = useState<boolean>(false);
  // 행별 개별 펼치기 상태
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleRowExpand = (id: string) => {
    const next = new Set(expandedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRowIds(next);
  };

  // [요구사항 1 개선] 샘플 데이터 CSV 로드 핸들러 (10~99개 TC 샘플 지원)
  const handleLoadSample = async (sampleType: string, label: string) => {
    try {
      setIsParsing(true);
      setShowSampleDropdown(false);
      const res = await fetch(`/api/sample-csv?file=${sampleType}`);
      if (!res.ok) throw new Error('샘플 파일을 불러오지 못했습니다.');
      
      const csvText = await res.text();
      setFileName(`${label} (샘플)`);

      Papa.parse<RawRequirementRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data;
          if (rows && rows.length > 0) {
            const generatedTCs = generateTestCasesFromRequirements(rows);
            onUpdateTcList(generatedTCs);
            setSelectedIds(new Set());
            setExpandedRowIds(new Set());
          }
          setIsParsing(false);
        },
        error: (err: any) => {
          console.error(err);
          alert('샘플 파싱 중 오류가 발생했습니다.');
          setIsParsing(false);
        }
      });
    } catch (e: any) {
      alert(e.message);
      setIsParsing(false);
    }
  };

  // CSV 파일 직접 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    Papa.parse<RawRequirementRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      complete: (results) => {
        const rows = results.data;
        if (rows && rows.length > 0) {
          const generatedTCs = generateTestCasesFromRequirements(rows);
          onUpdateTcList(generatedTCs);
          setSelectedIds(new Set());
          setExpandedRowIds(new Set());
        }
        setIsParsing(false);
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        alert('CSV 파일을 파싱하는 도중 오류가 발생했습니다: ' + error.message);
        setIsParsing(false);
      },
    });
  };

  /**
   * [요구사항 2 반영] 
   * 어떤 TC가 Fail 상태가 되면, 연관된 TC들(동일 요구사항 reqId를 갖는 다른 테스트케이스들)을 
   * 자동으로 Blocker 상태(우선순위 Critical, 연관 알림 실제결과)로 전환시킵니다.
   */
  const handleUpdateStatus = (id: string, newStatus: TCStatus) => {
    const targetTc = tcList.find((t) => t.id === id);
    let triggerGlobalBlock = newStatus === 'Blocker';

    const updated = tcList.map((tc) => {
      // 1) 대상 TC 상태 업데이트
      if (tc.id === id) {
        let updatedPriority = tc.priority;
        let updatedActual = tc.actual;

        if (newStatus === 'PASS') {
          updatedPriority = 'None';
          if (!updatedActual.trim() || updatedActual.includes('오동작') || updatedActual.includes('실패')) {
            updatedActual = '기대 결과와 일치함 (정상 동작 확인)';
          }
        } else if (newStatus === 'N/A') {
          // 상태가 N/A인 경우: 테스트 범위 제외이므로 결함 우선순위 None 설정 및 안내 텍스트
          updatedPriority = 'None';
          if (!updatedActual.trim() || updatedActual.includes('오동작') || updatedActual.includes('실패')) {
            updatedActual = '해당 기능 테스트 대상 제외 (N/A)';
          }
        } else if (newStatus === 'Blocker') {
          updatedPriority = 'Critical';
          if (!updatedActual.trim()) updatedActual = '치명적 결함 발생: 기능 중단 및 500 에러 발생';
        } else if (newStatus === 'Fail') {
          if (updatedPriority === 'None' || !updatedPriority) updatedPriority = 'Major';
          if (!updatedActual.trim() || updatedActual.includes('일치함')) {
            updatedActual = '기대 결과 불일치: 기능 오동작 또는 유효성 검증 실패';
          }
        }

        return { ...tc, status: newStatus, priority: updatedPriority, actual: updatedActual };
      }

      // 2) 대상 TC가 'Fail'로 전환된 경우: 연관된 동일 reqId의 미실행(Pending) TC들을 자동으로 'Blocker'로 설정
      if (newStatus === 'Fail' && targetTc && tc.reqId === targetTc.reqId) {
        if (tc.status === 'Pending') {
          triggerGlobalBlock = true;
          return {
            ...tc,
            status: 'Blocker' as TCStatus,
            priority: 'Critical' as TCPriority,
            actual: `[연관 TC(${targetTc.id}) Fail에 따른 블로킹] 선행 검증 실패로 테스트 진행 보류`,
          };
        }
      }

      return tc;
    });

    onUpdateTcList(updated);

    if (triggerGlobalBlock) {
      onTriggerBlocker();
    }
  };

  /**
   * 실제 결과 텍스트 입력 또는 칩 클릭 시 상태/우선순위/Action 자동 판정
   */
  const handleUpdateActualWithAutoStatus = (id: string, text: string) => {
    const lower = text.toLowerCase().trim();
    const targetTc = tcList.find((t) => t.id === id);

    let inferredStatus: TCStatus = 'Pending';
    let inferredPriority: TCPriority = targetTc ? targetTc.priority : 'Major';

    if (!text.trim()) {
      inferredStatus = 'Pending';
      inferredPriority = 'Major';
    } else if (
      lower.includes('block') ||
      lower.includes('블록') ||
      lower.includes('블로커') ||
      lower.includes('치명적') ||
      lower.includes('중단') ||
      lower.includes('crash') ||
      lower.includes('크래시') ||
      lower.includes('500')
    ) {
      inferredStatus = 'Blocker';
      inferredPriority = 'Critical';
    } else if (
      lower.includes('fail') ||
      lower.includes('실패') ||
      lower.includes('불일치') ||
      lower.includes('오류') ||
      lower.includes('오동작') ||
      lower.includes('에러') ||
      lower.includes('미노출') ||
      lower.includes('버그') ||
      lower.includes('결함')
    ) {
      inferredStatus = 'Fail';
      inferredPriority = (inferredPriority === 'None' || !inferredPriority) ? 'Major' : inferredPriority;
    } else if (
      lower.includes('pass') ||
      lower.includes('성공') ||
      lower.includes('정상') ||
      lower.includes('일치') ||
      lower.includes('통과') ||
      lower.includes('완료')
    ) {
      inferredStatus = 'PASS';
      inferredPriority = 'None';
    } else {
      if (targetTc && targetTc.status === 'Pending') {
        inferredStatus = 'PASS';
        inferredPriority = 'None';
      } else {
        inferredStatus = targetTc ? targetTc.status : 'PASS';
        inferredPriority = targetTc ? targetTc.priority : 'None';
      }
    }

    let triggerGlobalBlock = inferredStatus === 'Blocker';

    const updated = tcList.map((tc) => {
      if (tc.id === id) {
        return {
          ...tc,
          actual: text,
          status: inferredStatus,
          priority: inferredPriority,
        };
      }

      if (inferredStatus === 'Fail' && targetTc && tc.reqId === targetTc.reqId) {
        if (tc.status === 'Pending') {
          triggerGlobalBlock = true;
          return {
            ...tc,
            status: 'Blocker' as TCStatus,
            priority: 'Critical' as TCPriority,
            actual: `[연관 TC(${targetTc.id}) Fail에 따른 블로킹] 선행 검증 실패로 테스트 진행 보류`,
          };
        }
      }

      return tc;
    });

    onUpdateTcList(updated);

    if (triggerGlobalBlock) {
      onTriggerBlocker();
    }
  };

  // 결함 우선순위 변경 핸들러
  const handleUpdatePriority = (id: string, priority: TCPriority) => {
    const updated = tcList.map((tc) => {
      if (tc.id === id) {
        if (priority === 'Recommend') {
          return {
            ...tc,
            priority,
            status: 'Recommend' as TCStatus,
            actual: tc.actual || '개선 제안 사항 (테스트 실행 제외/권장)',
          };
        }
        return { ...tc, priority };
      }
      return tc;
    });
    onUpdateTcList(updated);
  };

  // 일괄 적용 기능
  const handleBulkStatus = (status: TCStatus) => {
    if (selectedIds.size === 0) {
      alert('적용할 테스트 케이스를 1개 이상 선택해주세요.');
      return;
    }

    let triggerBlock = status === 'Blocker';

    const updated = tcList.map((tc) => {
      if (selectedIds.has(tc.id)) {
        let updatedPriority = tc.priority;
        let updatedActual = tc.actual;

        if (status === 'PASS') {
          updatedPriority = 'None';
          if (!updatedActual) updatedActual = '기대 결과와 일치함 (PASS)';
        } else if (status === 'Fail') {
          if (updatedPriority === 'None') updatedPriority = 'Major';
          if (!updatedActual) updatedActual = '기능 결함 발생 (Fail)';
        } else if (status === 'Blocker') {
          updatedPriority = 'Critical';
          if (!updatedActual) updatedActual = '치명적 결함으로 테스트 중단 (Blocker)';
        }

        return { ...tc, status, priority: updatedPriority, actual: updatedActual };
      }
      return tc;
    });

    onUpdateTcList(updated);

    if (triggerBlock) {
      onTriggerBlocker();
    }
  };

  // 선택 항목 삭제
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      alert('삭제할 테스트 케이스를 선택해주세요.');
      return;
    }
    if (confirm(`선택한 ${selectedIds.size}개의 테스트 케이스를 삭제하시겠습니까?`)) {
      const updated = tcList.filter((tc) => !selectedIds.has(tc.id));
      onUpdateTcList(updated);
      setSelectedIds(new Set());
    }
  };

  // 단일 항목 삭제
  const handleDeleteSingle = (id: string) => {
    if (confirm(`테스트 케이스 [${id}]를 삭제하시겠습니까?`)) {
      const updated = tcList.filter((tc) => tc.id !== id);
      onUpdateTcList(updated);
      const nextSelected = new Set(selectedIds);
      nextSelected.delete(id);
      setSelectedIds(nextSelected);
    }
  };

  // 전체 선택/해제 토글
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredList.map((t) => t.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // 단일 항목 체크 토글
  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // 수정 모달 저장
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTc) return;

    const updated = tcList.map((tc) => (tc.id === editingTc.id ? editingTc : tc));
    onUpdateTcList(updated);
    setEditingTc(null);
  };

  // 전체 필드 통합 검색
  const filteredList = tcList.filter((tc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tc.id.toLowerCase().includes(q) ||
      tc.reqId.toLowerCase().includes(q) ||
      tc.featureName.toLowerCase().includes(q) ||
      tc.category.toLowerCase().includes(q) ||
      tc.testItem.toLowerCase().includes(q) ||
      (tc.preconditions && tc.preconditions.toLowerCase().includes(q)) ||
      (tc.steps && tc.steps.toLowerCase().includes(q)) ||
      (tc.expected && tc.expected.toLowerCase().includes(q)) ||
      (tc.actual && tc.actual.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || tc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isAllSelected = filteredList.length > 0 && filteredList.every((tc) => selectedIds.has(tc.id));

  // TC 유형 배지
  const getTypeBadge = (type: TestCase['type']) => {
    switch (type) {
      case 'Positive':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            🟢 Pos
          </span>
        );
      case 'Negative':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            🟠 Neg
          </span>
        );
      case 'Exception':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            🟣 Excep
          </span>
        );
      default:
        return <span className="text-slate-500">{type}</span>;
    }
  };

  // 상태 배지
  const getStatusBadge = (status: TCStatus) => {
    switch (status) {
      case 'PASS':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">PASS</span>;
      case 'Fail':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">Fail</span>;
      case 'Blocker':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white animate-pulse">Blocker</span>;
      case 'Recommend':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Recommend</span>;
      case 'N/A':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">N/A</span>;
      case 'Pending':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Pending</span>;
    }
  };

  // 우선순위 배지
  const getPriorityBadge = (priority: TCPriority, status: TCStatus) => {
    if (status === 'N/A') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-400 border border-slate-200">- (해당없음)</span>;
    }
    if (status === 'PASS' || priority === 'None') {
      return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-400 border border-slate-200">- (면제)</span>;
    }
    switch (priority) {
      case 'Critical':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-600 text-white">Critical</span>;
      case 'Major':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800 border border-orange-200">Major</span>;
      case 'Minor':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">Minor</span>;
      case 'Recommend':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700">Recommend</span>;
      default:
        return <span className="text-slate-400">-</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* 1. 상단 컨트롤 헤더 */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2">
              AI TC 자동 생성기 &amp; 실행기
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                Card 1
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              컴팩트 뷰 제공 • 10~99개 소형 샘플 지원 • 연관 TC Fail 시 자동 Blocker
            </p>
          </div>
        </div>

        {/* 파일 업로드 & [요구사항 1] 샘플 데이터 로드 드롭다운 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSampleDropdown(!showSampleDropdown)}
              disabled={isParsing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-indigo-600" />
              샘플 요구사항 CSV 자동 로드
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showSampleDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-30 text-xs">
                {/* 10~99개 빠른 테스트용 소형/중형 샘플 */}
                <div className="px-3 py-1 font-semibold text-[11px] text-indigo-600 uppercase tracking-wider bg-indigo-50/50">
                  ⚡ 10~99개 규모 (초고속 데모)
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadSample('quick', '빠른 데모 핵심 요구사항')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between cursor-pointer border-b border-slate-100"
                >
                  <span className="font-medium text-slate-800">⚡ 퀵 데모 5개 요구사항</span>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                    20개 TC
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('core', '쇼핑몰 핵심 12개 요구사항')}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex items-center justify-between cursor-pointer border-b border-slate-100"
                >
                  <span className="font-medium text-slate-800">📦 핵심 커머스 12개 요구사항</span>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                    48개 TC
                  </span>
                </button>

                {/* 100~300개 규모 대용량 샘플 */}
                <div className="px-3 py-1 font-semibold text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                  📊 100~300개 대용량 샘플
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadSample('ecommerce', '이커머스 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                >
                  <span>🛒 이커머스 쇼핑몰 (55건)</span>
                  <span className="text-[10px] text-slate-400">220 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('banking', '모바일 뱅킹 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                >
                  <span>🏦 모바일 뱅킹 (50건)</span>
                  <span className="text-[10px] text-slate-400">200 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('healthcare', '헬스케어 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                >
                  <span>🏥 헬스케어 플랫폼 (50건)</span>
                  <span className="text-[10px] text-slate-400">200 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('social', '소셜 미디어 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                >
                  <span>📱 소셜 미디어 (45건)</span>
                  <span className="text-[10px] text-slate-400">180 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('hr', 'HR 시스템 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                >
                  <span>👥 HR 인사관리 (48건)</span>
                  <span className="text-[10px] text-slate-400">192 TC</span>
                </button>
              </div>
            )}
          </div>

          {/* 직접 파일 업로드 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isParsing ? '파싱 중...' : '요구사항 CSV 업로드'}
          </button>
        </div>
      </div>

      {/* 툴바: 일괄 작업 + [요구사항 2] 텍스트 요약/상세 토글 + 검색 */}
      <div className="p-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* 일괄 처리 버튼 그룹 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700 mr-1 flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
            선택 {selectedIds.size}개:
          </span>
          <button
            type="button"
            onClick={() => handleBulkStatus('PASS')}
            disabled={selectedIds.size === 0}
            className="px-2 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            일괄 PASS
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus('Fail')}
            disabled={selectedIds.size === 0}
            className="px-2 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            일괄 Fail (연관 Blocker)
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus('Blocker')}
            disabled={selectedIds.size === 0}
            className="px-2 py-1 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            일괄 Blocker
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className="px-2 py-1 bg-white border border-rose-300 text-rose-600 rounded font-medium hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 ml-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            선택 삭제
          </button>
        </div>

        {/* [요구사항 2] 보기 모드 토글 & 통합 검색창 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 전체 절차/기대결과 펼치기/접기 토글 버튼 */}
          <button
            type="button"
            onClick={() => setIsExpandedAll(!isExpandedAll)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-md font-medium text-xs hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="재현절차와 기대결과를 전체 펼치거나 요약형(2줄)으로 접습니다"
          >
            {isExpandedAll ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>컴팩트 요약 뷰</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>상세 전체 펼치기</span>
              </>
            )}
          </button>

          {/* 통합 검색창 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="통합 검색 (TC-ID, 절차, 기대/실제결과)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none w-56 bg-white"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">전체 상태</option>
              <option value="Pending">Pending</option>
              <option value="PASS">PASS</option>
              <option value="Fail">Fail</option>
              <option value="Blocker">Blocker</option>
              <option value="Recommend">Recommend</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
        </div>
      </div>

      {/* 대용량 테이블 영역: Fixed Header + 내부 스크롤 (max-h-[600px]) */}
      <div className="flex-1 overflow-x-auto relative">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center">
              <Upload className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">등록된 테스트 케이스가 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">
                상단의 <strong>[샘플 요구사항 CSV 자동 로드]</strong>에서 20개 또는 48개 빠른 샘플을 불러와보세요.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              {/* 고정 헤더 */}
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-2.5 px-2 w-16 text-center">TC-ID</th>
                  <th className="py-2.5 px-2.5 min-w-[190px]">테스트 항목 &amp; 타입</th>
                  <th className="py-2.5 px-2.5 min-w-[130px]">사전조건</th>
                  <th className="py-2.5 px-2.5 min-w-[180px]">재현 절차</th>
                  <th className="py-2.5 px-2.5 min-w-[180px]">기대 결과</th>
                  <th className="py-2.5 px-2.5 min-w-[190px]">실제 결과 (자동 판정)</th>
                  <th className="py-2.5 px-2 w-20 text-center">상태</th>
                  <th className="py-2.5 px-2 w-24 text-center">결함 우선순위</th>
                  <th className="py-2.5 px-2.5 min-w-[200px] text-center sticky right-0 bg-slate-100 shadow-l">
                    실행 Action / 관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((tc) => {
                  const isChecked = selectedIds.has(tc.id);
                  const isBlockedByFail = tc.status === 'Blocker' && tc.actual.includes('Fail에 따른 블로킹');
                  const isRowExpanded = isExpandedAll || expandedRowIds.has(tc.id);

                  return (
                    <tr
                      key={tc.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isChecked ? 'bg-indigo-50/40' : ''
                      } ${tc.status === 'Blocker' ? 'bg-red-50/70' : ''}`}
                    >
                      {/* 행별 체크박스 */}
                      <td className="py-2 px-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(tc.id)}
                          className="cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                        />
                      </td>

                      {/* TC-ID */}
                      <td className="py-2 px-2 font-mono font-medium text-slate-700 text-center whitespace-nowrap align-top">
                        <span className="font-bold text-slate-800">{tc.id}</span>
                        <span className="block text-[10px] text-slate-400 font-sans">{tc.reqId}</span>
                      </td>

                      {/* 테스트 항목 및 타입 컬러 배지 */}
                      <td className="py-2 px-2.5 text-slate-900 font-medium align-top">
                        <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                          {getTypeBadge(tc.type)}
                          {isBlockedByFail && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                              <Link2 className="w-2.5 h-2.5" /> 연관 Blocker
                            </span>
                          )}
                        </div>
                        <div className="text-slate-800 font-medium leading-snug">{tc.testItem}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span className="bg-slate-100 px-1 py-0.2 rounded text-indigo-700 font-medium border border-slate-200">
                            {tc.category}
                          </span>
                          <span className="truncate max-w-[120px]">{tc.featureName}</span>
                        </div>
                      </td>

                      {/* 사전조건 (컴팩트 뷰 적용) */}
                      <td className="py-2 px-2.5 text-slate-600 leading-relaxed align-top">
                        <div className={isRowExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                          {tc.preconditions}
                        </div>
                      </td>

                      {/* [요구사항 2] 재현 절차 (컴팩트 뷰: 2줄 요약 + 더보기 토글) */}
                      <td className="py-2 px-2.5 text-slate-600 font-mono text-[11px] leading-relaxed align-top">
                        <div className={isRowExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                          {tc.steps}
                        </div>
                        {tc.steps && tc.steps.length > 40 && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(tc.id)}
                            className="text-[10px] text-indigo-600 hover:underline mt-0.5 inline-block font-sans cursor-pointer"
                          >
                            {isRowExpanded ? '접기 ▲' : '자세히 보기 ▼'}
                          </button>
                        )}
                      </td>

                      {/* [요구사항 2] 기대 결과 (컴팩트 뷰: 2줄 요약 + 더보기 토글) */}
                      <td className="py-2 px-2.5 text-slate-600 leading-relaxed align-top">
                        <div className={isRowExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                          {tc.expected}
                        </div>
                        {tc.expected && tc.expected.length > 40 && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(tc.id)}
                            className="text-[10px] text-indigo-600 hover:underline mt-0.5 inline-block cursor-pointer"
                          >
                            {isRowExpanded ? '접기 ▲' : '자세히 보기 ▼'}
                          </button>
                        )}
                      </td>

                      {/* 실제 결과 (입력 시 상태/우선순위/Action 자동 판정) */}
                      <td className="py-2 px-2.5 align-top">
                        <input
                          type="text"
                          value={tc.actual}
                          placeholder="결과 입력 (상태 자동)"
                          onChange={(e) => handleUpdateActualWithAutoStatus(tc.id, e.target.value)}
                          className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none mb-1 transition-colors ${
                            tc.status === 'PASS' 
                              ? 'border-emerald-300 bg-emerald-50/30' 
                              : tc.status === 'Fail' 
                              ? 'border-rose-300 bg-rose-50/30' 
                              : tc.status === 'Blocker'
                              ? 'border-red-400 bg-red-50/50 font-medium text-red-800'
                              : 'border-slate-200 bg-white'
                          }`}
                        />
                        <div className="flex gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleUpdateActualWithAutoStatus(tc.id, '기대 결과와 일치함 (정상)')}
                            className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-1 py-0.5 rounded font-medium cursor-pointer"
                            title="PASS 설정"
                          >
                            +일치(PASS)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateActualWithAutoStatus(tc.id, '기대 결과 불일치: 기능 오동작')}
                            className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-1 py-0.5 rounded font-medium cursor-pointer"
                            title="Fail 설정 및 연관 Blocker 동기화"
                          >
                            +오동작(Fail)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateActualWithAutoStatus(tc.id, '치명적 결함 발생: 500 에러')}
                            className="text-[10px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-1 py-0.5 rounded font-medium cursor-pointer"
                            title="Blocker 설정"
                          >
                            +에러(Block)
                          </button>
                        </div>
                      </td>

                      {/* 상태 드롭다운 & 배지 */}
                      <td className="py-2 px-2 text-center whitespace-nowrap align-top">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(tc.status)}
                          <select
                            value={tc.status}
                            disabled={tc.priority === 'Recommend'}
                            onChange={(e) => handleUpdateStatus(tc.id, e.target.value as TCStatus)}
                            className="text-[11px] border border-slate-200 rounded px-1 py-0.5 text-slate-700 mt-1 bg-white cursor-pointer hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="Pending">Pending</option>
                            <option value="PASS">PASS</option>
                            <option value="Fail">Fail</option>
                            <option value="Blocker">Blocker</option>
                            <option value="Recommend">Recommend</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      </td>

                      {/* 결함 우선순위 */}
                      <td className="py-2 px-2 text-center whitespace-nowrap align-top">
                        <div className="flex flex-col items-center gap-1">
                          {getPriorityBadge(tc.priority, tc.status)}
                          <select
                            value={tc.priority}
                            disabled={tc.status === 'PASS' || tc.status === 'N/A'}
                            onChange={(e) => handleUpdatePriority(tc.id, e.target.value as TCPriority)}
                            className="text-[11px] border border-slate-200 rounded px-1 py-0.5 text-slate-700 mt-1 bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed hover:border-slate-300"
                          >
                            <option value="None">None (면제)</option>
                            <option value="Critical">Critical</option>
                            <option value="Major">Major</option>
                            <option value="Minor">Minor</option>
                            <option value="Recommend">Recommend</option>
                          </select>
                        </div>
                      </td>

                      {/* 액션 버튼 [PASS], [Fail], [Blocker] + 수정/삭제 */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs shadow-l align-top">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={tc.status === 'N/A' || tc.priority === 'Recommend'}
                            onClick={() => handleUpdateStatus(tc.id, 'PASS')}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-1 border rounded font-semibold text-[11px] transition-colors ${
                              tc.status === 'N/A' || tc.priority === 'Recommend'
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                : tc.status === 'PASS'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs cursor-pointer'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-300 cursor-pointer'
                            }`}
                            title={tc.status === 'N/A' ? '테스트 대상 제외 (N/A)' : tc.priority === 'Recommend' ? '권장 개선 사항 (실행 비활성화)' : 'PASS 처리'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PASS
                          </button>
                          <button
                            type="button"
                            disabled={tc.status === 'N/A' || tc.priority === 'Recommend'}
                            onClick={() => handleUpdateStatus(tc.id, 'Fail')}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-1 border rounded font-semibold text-[11px] transition-colors ${
                              tc.status === 'N/A' || tc.priority === 'Recommend'
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                : tc.status === 'Fail'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs cursor-pointer'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border-rose-300 cursor-pointer'
                            }`}
                            title={tc.status === 'N/A' ? '테스트 대상 제외 (N/A)' : tc.priority === 'Recommend' ? '권장 개선 사항 (실행 비활성화)' : 'Fail 처리'}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Fail
                          </button>
                          <button
                            type="button"
                            disabled={tc.status === 'N/A' || tc.priority === 'Recommend'}
                            onClick={() => handleUpdateStatus(tc.id, 'Blocker')}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded font-semibold text-[11px] shadow-sm transition-colors ${
                              tc.status === 'N/A' || tc.priority === 'Recommend'
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                : tc.status === 'Blocker'
                                ? 'bg-red-800 text-white cursor-pointer'
                                : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                            }`}
                            title={tc.status === 'N/A' ? '테스트 대상 제외 (N/A)' : tc.priority === 'Recommend' ? '권장 개선 사항 (실행 비활성화)' : 'Blocker 처리'}
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            Blocker
                          </button>

                          {/* 수정 & 삭제 */}
                          <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-1">
                            <button
                              type="button"
                              onClick={() => setEditingTc(tc)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                              title="수정"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(tc.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 푸터 요약 정보 바 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap justify-between items-center gap-2">
        <span>
          전체 <strong>{tcList.length}</strong>개 TC 중 <strong>{filteredList.length}</strong>개 표시 (선택: {selectedIds.size}개)
        </span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            PASS: {tcList.filter((t) => t.status === 'PASS').length}
          </span>
          <span className="flex items-center gap-1 text-rose-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            Fail: {tcList.filter((t) => t.status === 'Fail').length}
          </span>
          <span className="flex items-center gap-1 text-red-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping"></span>
            Blocker: {tcList.filter((t) => t.status === 'Blocker').length}
          </span>
        </div>
      </div>

      {/* TC 수정 모달 */}
      {editingTc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" />
                테스트 케이스 수정 [{editingTc.id}]
              </h3>
              <button
                onClick={() => setEditingTc(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">테스트 항목</label>
                <input
                  type="text"
                  value={editingTc.testItem}
                  onChange={(e) => setEditingTc({ ...editingTc, testItem: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">사전조건</label>
                  <textarea
                    rows={3}
                    value={editingTc.preconditions}
                    onChange={(e) => setEditingTc({ ...editingTc, preconditions: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">재현 절차</label>
                  <textarea
                    rows={3}
                    value={editingTc.steps}
                    onChange={(e) => setEditingTc({ ...editingTc, steps: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">기대 결과</label>
                  <textarea
                    rows={2}
                    value={editingTc.expected}
                    onChange={(e) => setEditingTc({ ...editingTc, expected: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">실제 결과</label>
                  <textarea
                    rows={2}
                    value={editingTc.actual}
                    onChange={(e) => setEditingTc({ ...editingTc, actual: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">상태</label>
                  <select
                    value={editingTc.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as TCStatus;
                      setEditingTc({
                        ...editingTc,
                        status: nextStatus,
                        priority: (nextStatus === 'PASS' || nextStatus === 'N/A') ? 'None' : editingTc.priority,
                      });
                    }}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="PASS">PASS</option>
                    <option value="Fail">Fail</option>
                    <option value="Blocker">Blocker</option>
                    <option value="Recommend">Recommend</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">결함 우선순위</label>
                  <select
                    value={editingTc.priority}
                    disabled={editingTc.status === 'PASS' || editingTc.status === 'N/A'}
                    onChange={(e) => setEditingTc({ ...editingTc, priority: e.target.value as TCPriority })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-100"
                  >
                    <option value="None">None (면제)</option>
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Recommend">Recommend</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingTc(null)}
                  className="px-3.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
