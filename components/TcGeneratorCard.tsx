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
  Zap,
  Plus,
  FilePlus,
  PlusCircle,
  Download
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
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  
  // 1. 전체 필드 통합 검색창 및 상태 필터
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 체크박스 선택 상태 (ID 집합)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 수정 모달 대상
  const [editingTc, setEditingTc] = useState<TestCase | null>(null);

  // TC 추가 모달 상태
  const [showAddTcModal, setShowAddTcModal] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [singleTcForm, setSingleTcForm] = useState<{
    category: string;
    featureName: string;
    type: TestCase['type'];
    testItem: string;
    preconditions: string;
    steps: string;
    expected: string;
    priority: TCPriority;
  }>({
    category: '기능검증',
    featureName: '신규 기능',
    type: 'Positive',
    testItem: '',
    preconditions: '',
    steps: '',
    expected: '',
    priority: 'Major',
  });
  const [bulkCsvText, setBulkCsvText] = useState<string>('');

  // 샘플 데이터 선택 드롭다운 상태
  const [showSampleDropdown, setShowSampleDropdown] = useState<boolean>(false);
  const [showAddMenuDropdown, setShowAddMenuDropdown] = useState<boolean>(false);

  // 테이블 텍스트 펼치기/접기 모드 (기본: 요약형 컴팩트 뷰)
  const [isExpandedAll, setIsExpandedAll] = useState<boolean>(false);
  // 행별 개별 펼치기 상태
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  const toggleRowExpand = (id: string) => {
    const next = new Set(expandedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRowIds(next);
  };

  // 샘플 데이터 CSV 로드 핸들러 (정적 CSV 파일 로드)
  const handleLoadSample = async (sampleType: string, label: string) => {
    const filePath = `/samples/${sampleType.toLowerCase()}.csv`;
    try {
      setIsParsing(true);
      setShowSampleDropdown(false);
      const res = await fetch(filePath);
      if (!res.ok) {
        throw new Error(`샘플 파일을 불러오지 못했습니다. (경로: ${filePath}, 상태: ${res.status})`);
      }
      
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
        error: (parseError: Error) => {
          alert(`샘플 파싱 중 오류가 발생했습니다: ${parseError.message}`);
          setIsParsing(false);
        },
      });
    } catch (err: unknown) {
      const msg = (err as Error).message || `샘플 파일을 불러오지 못했습니다. (경로: ${filePath})`;
      alert(msg);
      setIsParsing(false);
    }
  };

  // 신규 CSV 업로드 (기존 TC 교체)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    Papa.parse<RawRequirementRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows && rows.length > 0) {
          const generatedTCs = generateTestCasesFromRequirements(rows);
          onUpdateTcList(generatedTCs);
          setSelectedIds(new Set());
          setExpandedRowIds(new Set());
        } else {
          alert('CSV 파일에 유효한 데이터 행이 없습니다.');
        }
        setIsParsing(false);
      },
      error: () => {
        alert('CSV 파일 파싱 중 오류가 발생했습니다.');
        setIsParsing(false);
      },
    });

    if (e.target) e.target.value = '';
  };

  // CSV 추가 병합 업로드 (기존 목록 유지하고 새 TC Append)
  const handleAppendFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);

    Papa.parse<RawRequirementRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (rows && rows.length > 0) {
          let maxIndex = 0;
          tcList.forEach((t) => {
            const num = parseInt(t.id.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(num) && num > maxIndex) maxIndex = num;
          });

          const newTCs = generateTestCasesFromRequirements(rows).map((tc, idx) => ({
            ...tc,
            id: `TC-${String(maxIndex + 1 + idx).padStart(3, '0')}`,
          }));

          onUpdateTcList([...tcList, ...newTCs]);
          alert(`${newTCs.length}개의 테스트 케이스가 기존 목록에 성공적으로 추가되었습니다.`);
        } else {
          alert('CSV 파일에 유효한 데이터 행이 없습니다.');
        }
        setIsParsing(false);
      },
      error: () => {
        alert('CSV 파일 파싱 중 오류가 발생했습니다.');
        setIsParsing(false);
      },
    });

    if (e.target) e.target.value = '';
  };

  // 1개 TC 직접 추가 핸들러
  const handleAddSingleTc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleTcForm.testItem.trim() || !singleTcForm.featureName.trim()) {
      alert('기능명과 테스트 항목은 필수입니다.');
      return;
    }

    let maxIndex = 0;
    tcList.forEach((t) => {
      const num = parseInt(t.id.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > maxIndex) maxIndex = num;
    });

    const newId = `TC-${String(maxIndex + 1).padStart(3, '0')}`;
    const newReqId = `REQ-${String(Math.floor((maxIndex + 1) / 2) + 1).padStart(3, '0')}`;

    const newTc: TestCase = {
      id: newId,
      reqId: newReqId,
      category: singleTcForm.category || '기능검증',
      featureName: singleTcForm.featureName,
      type: singleTcForm.type,
      testItem: singleTcForm.testItem,
      preconditions: singleTcForm.preconditions || '기본 권한 및 화면 진입 완료',
      steps: singleTcForm.steps || '1. 화면에 접근한다.\n2. 동작을 실행한다.',
      expected: singleTcForm.expected || '정상 처리되어야 함.',
      actual: '',
      status: 'Pending',
      priority: singleTcForm.priority,
    };

    onUpdateTcList([...tcList, newTc]);
    alert(`테스트 케이스 [${newId}]가 등록되었습니다.`);
    setShowAddTcModal(false);
    setSingleTcForm({
      category: '기능검증',
      featureName: '',
      type: 'Positive',
      testItem: '',
      preconditions: '',
      steps: '',
      expected: '',
      priority: 'Major',
    });
  };

  // 다수 TC 일괄 등록 (CSV 텍스트 또는 줄바꿈 텍스트 파싱)
  const handleAddBulkCsvText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) {
      alert('붙여넣을 텍스트 내용을 입력해주세요.');
      return;
    }

    Papa.parse<RawRequirementRow>(bulkCsvText.trim(), {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        let generated: TestCase[] = [];

        const hasHeader = rows.length > 0 && Object.keys(rows[0]).some((k) => 
          k.includes('기능') || k.includes('대분류') || k.includes('요구사항') || k.includes('항목')
        );

        let maxIndex = 0;
        tcList.forEach((t) => {
          const num = parseInt(t.id.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > maxIndex) maxIndex = num;
        });

        if (hasHeader) {
          generated = generateTestCasesFromRequirements(rows).map((tc, idx) => ({
            ...tc,
            id: `TC-${String(maxIndex + 1 + idx).padStart(3, '0')}`,
          }));
        } else {
          const lines = bulkCsvText
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          generated = lines.map((line, idx) => {
            const parts = line.split(/[,;\t]/).map((p) => p.trim());
            const feature = parts[0] || '사용자 정의 기능';
            const item = parts[1] || `[정상] ${feature} 동작 검증`;
            const exp = parts[2] || '정상 처리 및 기대 결과와 일치해야 함.';

            return {
              id: `TC-${String(maxIndex + 1 + idx).padStart(3, '0')}`,
              reqId: `REQ-${String(Math.floor((maxIndex + 1 + idx) / 2) + 1).padStart(3, '0')}`,
              category: '기능검증',
              featureName: feature,
              type: 'Positive' as const,
              testItem: item,
              preconditions: '기본 권한 및 화면 진입 완료',
              steps: `1. ${feature} 메뉴에 접근한다.\n2. 입력을 완료하고 동작을 실행한다.`,
              expected: exp,
              actual: '',
              status: 'Pending' as const,
              priority: 'Major' as const,
            };
          });
        }

        if (generated.length > 0) {
          onUpdateTcList([...tcList, ...generated]);
          alert(`${generated.length}개의 테스트 케이스가 성공적으로 추가되었습니다.`);
          setShowAddTcModal(false);
          setBulkCsvText('');
        } else {
          alert('인식 가능한 테스트 케이스가 없습니다. 내용을 다시 확인해주세요.');
        }
      },
      error: () => {
        alert('텍스트 파싱 중 오류가 발생했습니다.');
      }
    });
  };

  // Card 1 전체 테스트 케이스 CSV 다운로드
  const handleExportTcListCsv = () => {
    if (tcList.length === 0) {
      alert('내보낼 테스트 케이스가 없습니다.');
      return;
    }

    const headers = [
      'TC-ID',
      '요구사항 ID',
      '대분류',
      '기능명',
      '테스트 유형',
      '테스트 항목',
      '사전 조건',
      '재현 절차',
      '기대 결과',
      '실제 결과',
      '상태',
      '결함 우선순위'
    ];
    const rows = tcList.map((tc) => [
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

    const csvContent = '\uFEFF' + [headers, ...rows].map(formatRow).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Q-Safe_TC_목록_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 연관 TC 자동 Blocker 설정 및 상태 업데이트
  const handleUpdateStatus = (id: string, newStatus: TCStatus) => {
    const targetTc = tcList.find((t) => t.id === id);
    const targetReqId = targetTc ? targetTc.reqId : '';
    let shouldTriggerBlocker = false;

    const updated = tcList.map((tc) => {
      if (tc.id === id) {
        let updatedPriority = tc.priority;
        let updatedActual = tc.actual;

        if (newStatus === 'PASS') {
          updatedPriority = 'None';
          if (!updatedActual.trim() || updatedActual.includes('오동작') || updatedActual.includes('실패')) {
            updatedActual = '기대 결과와 일치함 (정상 동작 확인)';
          }
        } else if (newStatus === 'N/A') {
          updatedPriority = 'None';
          if (!updatedActual.trim() || updatedActual.includes('오동작') || updatedActual.includes('실패')) {
            updatedActual = '해당 기능 테스트 대상 제외 (N/A)';
          }
        } else if (newStatus === 'Blocker') {
          updatedPriority = 'Critical';
          if (!updatedActual.trim()) updatedActual = '치명적 결함 발생: 기능 중단 및 500 에러 발생';
          shouldTriggerBlocker = true;
        } else if (newStatus === 'Fail') {
          if (updatedPriority === 'None' || !updatedPriority) updatedPriority = 'Major';
          if (!updatedActual.trim() || updatedActual.includes('일치함')) {
            updatedActual = '기대 결과 불일치: 기능 오동작 또는 유효성 검증 실패';
          }
          // 오직 결함 우선순위가 Critical일 때만 긴급 Blocker를 트리거함
          if (updatedPriority === 'Critical') {
            shouldTriggerBlocker = true;
          }
        } else if (newStatus === 'Recommend') {
          updatedPriority = 'Recommend';
          if (!updatedActual.trim() || updatedActual.includes('일치함')) {
            updatedActual = '개선 제안 사항 (테스트 검증 완료 및 개선 권장)';
          }
        }

        return { ...tc, status: newStatus, priority: updatedPriority, actual: updatedActual };
      }

      // 연관 TC 자동 Blocker 설정: 대상 TC가 Blocker이거나 Critical 결함일 때만 연관 Pending TC를 Blocker로 전환
      if (
        (newStatus === 'Blocker' || (newStatus === 'Fail' && targetTc?.priority === 'Critical')) &&
        targetReqId &&
        tc.reqId === targetReqId &&
        tc.id !== id
      ) {
        if (tc.status === 'Pending') {
          return {
            ...tc,
            status: 'Blocker' as TCStatus,
            priority: 'Critical' as TCPriority,
            actual: `[연관 TC(${targetTc?.id || id}) 치명적 결함에 따른 블로킹] 선행 검증 실패로 추가 테스트 차단`,
          };
        }
      }

      return tc;
    });

    onUpdateTcList(updated);

    if (shouldTriggerBlocker) {
      onTriggerBlocker();
    }
  };

  // 실제 결과 텍스트 입력 시 자동 판정
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
      } else if (targetTc) {
        inferredStatus = targetTc.status;
        inferredPriority = targetTc.priority;
      }
    }

    const updated = tcList.map((tc) =>
      tc.id === id ? { ...tc, actual: text, status: inferredStatus, priority: inferredPriority } : tc
    );
    onUpdateTcList(updated);

    if (inferredStatus === 'Blocker' || (inferredStatus === 'Fail' && inferredPriority === 'Critical')) {
      onTriggerBlocker();
    }
  };

  // 우선순위 업데이트
  const handleUpdatePriority = (id: string, newPriority: TCPriority) => {
    const updated = tcList.map((tc) =>
      tc.id === id ? { ...tc, priority: newPriority } : tc
    );
    onUpdateTcList(updated);

    const target = updated.find((t) => t.id === id);
    if (newPriority === 'Critical' && (target?.status === 'Fail' || target?.status === 'Blocker')) {
      onTriggerBlocker();
    }
  };

  // 선택한 항목만 일괄 상태 변경
  const handleApplySelectedStatus = (status: TCStatus) => {
    if (selectedIds.size === 0) {
      alert('상태를 변경할 테스트 케이스를 체크박스로 1개 이상 선택해주세요.');
      return;
    }

    let triggerBlock = false;
    const updated = tcList.map((tc) => {
      if (selectedIds.has(tc.id)) {
        let updatedPriority = tc.priority;
        let updatedActual = tc.actual;

        if (status === 'PASS') {
          updatedPriority = 'None';
          if (!updatedActual || updatedActual.includes('오동작') || updatedActual.includes('실패')) {
            updatedActual = '기대 결과와 일치함 (PASS)';
          }
        } else if (status === 'Fail') {
          if (updatedPriority === 'None') updatedPriority = 'Major';
          if (!updatedActual || updatedActual.includes('일치함')) {
            updatedActual = '기능 결함 발생 (Fail)';
          }
          if (updatedPriority === 'Critical') {
            triggerBlock = true;
          }
        } else if (status === 'Blocker') {
          updatedPriority = 'Critical';
          if (!updatedActual) updatedActual = '치명적 결함으로 테스트 중단 (Blocker)';
          triggerBlock = true;
        } else if (status === 'Recommend') {
          updatedPriority = 'Recommend';
          if (!updatedActual) updatedActual = '개선 제안 사항 (테스트 검증 완료 및 개선 권장)';
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

  // 전체 일괄 상태 적용
  const handleApplyAllStatus = (status: TCStatus) => {
    if (tcList.length === 0) return;
    const triggerBlock = status === 'Blocker';

    const updated = tcList.map((tc) => {
      let updatedPriority = tc.priority;
      let updatedActual = tc.actual;

      if (status === 'PASS') {
        updatedPriority = 'None';
        if (!updatedActual || updatedActual.includes('오동작') || updatedActual.includes('실패')) {
          updatedActual = '기대 결과와 일치함 (PASS)';
        }
      } else if (status === 'Fail') {
        if (updatedPriority === 'None') updatedPriority = 'Major';
        if (!updatedActual || updatedActual.includes('일치함')) {
          updatedActual = '기능 결함 발생 (Fail)';
        }
      } else if (status === 'Blocker') {
        updatedPriority = 'Critical';
        if (!updatedActual) updatedActual = '치명적 결함으로 테스트 중단 (Blocker)';
      } else if (status === 'Recommend') {
        updatedPriority = 'Recommend';
        if (!updatedActual) updatedActual = '개선 제안 사항 (테스트 검증 완료 및 개선 권장)';
      }

      return { ...tc, status, priority: updatedPriority, actual: updatedActual };
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
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F8F2] text-[#1B8055] border border-[#C6EFE0]">
            🟢 Pos
          </span>
        );
      case 'Negative':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFEBF1] text-[#D83664] border border-[#FCD2DF]">
            🟠 Neg
          </span>
        );
      case 'Boundary':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF9E6] text-[#A16207] border border-[#FDE68A]">
            🟡 Bound
          </span>
        );
      case 'Exception':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#7DD3FC]">
            🔵 Excep
          </span>
        );
      default:
        return <span className="text-[#7B6891]">{type}</span>;
    }
  };

  // 상태 배지
  const getStatusBadge = (status: TCStatus) => {
    switch (status) {
      case 'PASS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F8F2] text-[#1B8055] border border-[#C6EFE0]">PASS</span>;
      case 'Fail':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFEBF1] text-[#D83664] border border-[#FCD2DF]">Fail</span>;
      case 'Blocker':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#E11D48] to-[#9333EA] text-white shadow-xs animate-pulse">Blocker</span>;
      case 'Recommend':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]">개선사항</span>;
      case 'N/A':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F2F7] text-[#766B84] border border-[#E4DEEB]">N/A</span>;
      case 'Pending':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF9E6] text-[#A16207] border border-[#FBECC2]">Pending</span>;
    }
  };

  // 우선순위 배지
  const getPriorityBadge = (priority: TCPriority, status: TCStatus) => {
    if (status === 'N/A') {
      return <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#FAF7FD] text-[#AFA1BF] border border-[#E8DCF7]">- (해당없음)</span>;
    }
    if (status === 'PASS' || priority === 'None') {
      return <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[#FAF7FD] text-[#AFA1BF] border border-[#E8DCF7]">- (면제)</span>;
    }
    switch (priority) {
      case 'Critical':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-600 text-white shadow-2xs">Critical</span>;
      case 'Major':
        return <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Major</span>;
      case 'Minor':
        return <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">Minor</span>;
      case 'Recommend':
        return <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">Recommend</span>;
      default:
        return <span className="text-[#AFA1BF]">-</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#EADBF8] shadow-[0_12px_40px_rgba(180,150,230,0.15)] flex flex-col h-full overflow-hidden">
      {/* 1. 상단 컨트롤 헤더 */}
      <div className="p-4 border-b border-[#ECE0F9] bg-gradient-to-r from-[#FAF6FD] to-[#F3ECFB] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-[#906FE7] to-[#C4B5FD] text-white rounded-2xl shadow-sm shadow-purple-200/50">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-[#2E1A47] text-base md:text-lg flex items-center gap-2">
              <span>AI TC 자동 생성기 &amp; 실행기</span>
              <span className="text-xs bg-[#F3ECFB] text-[#7C3AED] px-2.5 py-0.5 rounded-full font-bold border border-[#DDD0F5]">
                Card 1
              </span>
            </h2>
            <p className="text-xs text-[#7B6891]">
              컴팩트 뷰 제공 • 10~99개 소형 샘플 지원 • 연관 TC Fail 시 자동 Blocker
            </p>
          </div>
        </div>

        {/* 파일 업로드 & 샘플 데이터 로드 드롭다운 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSampleDropdown(!showSampleDropdown)}
              disabled={isParsing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#7C3AED] bg-[#F3ECFB] hover:bg-[#EBDDF9] border border-[#DDD0F5] rounded-2xl shadow-2xs transition-colors cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-[#8B5CF6]" />
              샘플 요구사항 CSV 자동 로드
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showSampleDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-[#EADBF8] rounded-2xl shadow-xl py-1.5 z-30 text-xs animate-in fade-in zoom-in-95">
                {/* 10~99개 빠른 테스트용 소형/중형 샘플 */}
                <div className="px-3 py-1 font-semibold text-[11px] text-[#7C3AED] uppercase tracking-wider bg-[#F3ECFB]/60 rounded-t-xl">
                  ⚡ 10~99개 규모 (초고속 데모)
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadSample('quick', '빠른 데모 핵심 요구사항')}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer border-b border-[#F2EAFD]"
                >
                  <span className="font-medium text-[#2E1A47]">⚡ 퀵 데모 5개 요구사항</span>
                  <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded-lg">
                    20개 TC
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('core', '쇼핑몰 핵심 12개 요구사항')}
                  className="w-full text-left px-3 py-2 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer border-b border-[#F2EAFD]"
                >
                  <span className="font-medium text-[#2E1A47]">📦 핵심 커머스 12개 요구사항</span>
                  <span className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded-lg">
                    48개 TC
                  </span>
                </button>

                {/* 100~300개 규모 대용량 샘플 */}
                <div className="px-3 py-1 font-semibold text-[11px] text-[#AFA1BF] uppercase tracking-wider mt-1">
                  📊 100~300개 대용량 샘플
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadSample('ecommerce', '이커머스 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[#2E1A47]">🛒 이커머스 쇼핑몰 (55건)</span>
                  <span className="text-[10px] text-[#AFA1BF]">220 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('banking', '모바일 뱅킹 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[#2E1A47]">🏦 모바일 뱅킹 (50건)</span>
                  <span className="text-[10px] text-[#AFA1BF]">200 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('healthcare', '헬스케어 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[#2E1A47]">🏥 헬스케어 플랫폼 (50건)</span>
                  <span className="text-[10px] text-[#AFA1BF]">200 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('social', '소셜 미디어 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[#2E1A47]">📱 소셜 미디어 (45건)</span>
                  <span className="text-[10px] text-[#AFA1BF]">180 TC</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('hr', 'HR 시스템 요구사항 v2')}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FAF6FE] flex items-center justify-between cursor-pointer rounded-b-2xl"
                >
                  <span className="text-[#2E1A47]">👥 HR 인사관리 (48건)</span>
                  <span className="text-[10px] text-[#AFA1BF]">192 TC</span>
                </button>
              </div>
            )}
          </div>

          {/* 숨김 파일 업로드 input: 교체용 vs 추가(Append)용 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <input
            type="file"
            ref={appendFileInputRef}
            onChange={handleAppendFileUpload}
            accept=".csv"
            className="hidden"
          />

          {/* 요구사항 CSV 신규 업로드 (전체 교체) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-[#9F7AEA] via-[#8B5CF6] to-[#7C3AED] hover:from-[#906BE0] hover:to-[#6D28D9] rounded-2xl shadow-md shadow-purple-200/60 transition-all cursor-pointer disabled:opacity-50"
            title="기존 목록을 비우고 새 CSV 파일 내용으로 TC를 생성합니다"
          >
            <Upload className="w-4 h-4" />
            {isParsing ? '파싱 중...' : '요구사항 CSV 업로드'}
          </button>

          {/* TC 추가 (한 개 / 다수 / CSV 추가) 드롭다운 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAddMenuDropdown(!showAddMenuDropdown);
                setShowSampleDropdown(false);
              }}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs md:text-sm font-bold text-[#7C3AED] bg-white hover:bg-[#F3ECFB] border border-[#DDD0F5] rounded-2xl shadow-xs transition-colors cursor-pointer"
              title="TC를 한 개 또는 다수로 추가하거나, 기존 목록에 CSV를 추가로 병합합니다"
            >
              <PlusCircle className="w-4 h-4 text-[#8B5CF6]" />
              <span>TC 추가</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showAddMenuDropdown && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-[#EADBF8] rounded-2xl shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setAddMode('single');
                    setShowAddTcModal(true);
                    setShowAddMenuDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF6FE] flex items-center gap-2 cursor-pointer text-[#2E1A47]"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold">TC 한 개 직접 추가</div>
                    <div className="text-[10px] text-[#AFA1BF]">폼을 작성하여 1개 TC 등록</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddMode('bulk');
                    setShowAddTcModal(true);
                    setShowAddMenuDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF6FE] flex items-center gap-2 cursor-pointer text-[#2E1A47] border-t border-[#F2EAFD]"
                >
                  <FilePlus className="w-4 h-4 text-[#8B5CF6]" />
                  <div>
                    <div className="font-bold">TC 다수 추가 (텍스트 붙여넣기)</div>
                    <div className="text-[10px] text-[#AFA1BF]">CSV/줄 단위로 여러 TC 일괄 생성</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenuDropdown(false);
                    appendFileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF6FE] flex items-center gap-2 cursor-pointer text-[#2E1A47] border-t border-[#F2EAFD]"
                >
                  <Upload className="w-4 h-4 text-[#7C3AED]" />
                  <div>
                    <div className="font-bold">CSV 파일로 TC 추가 (병합)</div>
                    <div className="text-[10px] text-[#AFA1BF]">기존 목록 유지 + 새 파일 내용 추가</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddMenuDropdown(false);
                    handleExportTcListCsv();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#FAF6FE] flex items-center gap-2 cursor-pointer text-[#2E1A47] border-t border-[#F2EAFD]"
                >
                  <Download className="w-4 h-4 text-[#8B5CF6]" />
                  <div>
                    <div className="font-bold">현재 TC 목록 CSV 다운로드</div>
                    <div className="text-[10px] text-[#AFA1BF]">Card 1 테스트 케이스 전체 내보내기</div>
                  </div>
                </button>

                {/* 샘플 TC 즉시 추가 (1개 / 다수 4개) */}
                <div className="border-t border-[#F2EAFD] bg-[#FAF7FD] p-2 space-y-1 rounded-b-2xl">
                  <div className="text-[10px] font-bold text-[#AFA1BF] uppercase tracking-wider px-1">
                    ⚡ 샘플 TC 즉시 추가
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenuDropdown(false);
                      let maxIndex = 0;
                      tcList.forEach((t) => {
                        const num = parseInt(t.id.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(num) && num > maxIndex) maxIndex = num;
                      });
                      const sampleTc: TestCase = {
                        id: `TC-${String(maxIndex + 1).padStart(3, '0')}`,
                        reqId: `REQ-${String(Math.floor((maxIndex + 1) / 2) + 1).padStart(3, '0')}`,
                        category: '회원/인증',
                        featureName: '소셜 간편 로그인',
                        type: 'Positive',
                        testItem: '[정상] 카카오 간편 로그인 성공 후 토큰 발급 및 홈 이동 검증',
                        preconditions: '카카오 계정 보유 및 앱 로그인 화면 진입 상태',
                        steps: '1. [카카오로 시작하기] 버튼 클릭\n2. 카카오 계정 인증 및 제3자 정보제공 동의 완료\n3. 로그인 완료 처리 확인',
                        expected: '로그인 완료 안내 토스트 노출 및 사용자 메인 대시보드로 즉시 라우팅되어야 함.',
                        actual: '',
                        status: 'Pending',
                        priority: 'Major',
                      };
                      onUpdateTcList([...tcList, sampleTc]);
                      alert('샘플 TC 1개가 성공적으로 추가되었습니다.');
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-white rounded-xl text-[#2E1A47] flex items-center justify-between cursor-pointer border border-transparent hover:border-[#DDD0F5] transition-colors"
                  >
                    <span className="font-medium text-emerald-800">✨ 샘플 TC 1개 추가</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-bold">+1 TC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenuDropdown(false);
                      let maxIndex = 0;
                      tcList.forEach((t) => {
                        const num = parseInt(t.id.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(num) && num > maxIndex) maxIndex = num;
                      });
                      const reqNum = Math.floor((maxIndex + 1) / 4) + 1;
                      const sampleSet: TestCase[] = [
                        {
                          id: `TC-${String(maxIndex + 1).padStart(3, '0')}`,
                          reqId: `REQ-${String(reqNum).padStart(3, '0')}`,
                          category: '결제/주문',
                          featureName: '간편결제 원클릭 승인',
                          type: 'Positive',
                          testItem: '[정상] 등록된 카드 원클릭 결제 성공 및 주문번호 생성 검증',
                          preconditions: '장바구니에 상품이 담겨 있고 기본 결제수단이 등록된 상태',
                          steps: '1. 주문서 작성 화면에서 [원클릭 결제] 버튼 클릭\n2. 생체 인증 또는 결제 비밀번호 6자리 입력\n3. 결제 승인 완료 확인',
                          expected: 'PG사 승인 성공 후 결제 완료 화면으로 전환되고 주문 완료 알림톡이 발송되어야 함.',
                          actual: '',
                          status: 'Pending',
                          priority: 'Critical',
                        },
                        {
                          id: `TC-${String(maxIndex + 2).padStart(3, '0')}`,
                          reqId: `REQ-${String(reqNum).padStart(3, '0')}`,
                          category: '결제/주문',
                          featureName: '간편결제 원클릭 승인',
                          type: 'Negative',
                          testItem: '[예외] 결제 비밀번호 5회 연속 오류 시 계정 잠금 및 재인증 요구',
                          preconditions: '결제 비밀번호 입력 팝업 노출 상태',
                          steps: '1. 잘못된 비밀번호를 5회 연속 입력한다.',
                          expected: '5회 오류 안내 팝업이 노출되고 결제 비밀번호 재설정 페이지로 이동해야 함.',
                          actual: '',
                          status: 'Pending',
                          priority: 'Major',
                        },
                        {
                          id: `TC-${String(maxIndex + 3).padStart(3, '0')}`,
                          reqId: `REQ-${String(reqNum).padStart(3, '0')}`,
                          category: '결제/주문',
                          featureName: '쿠폰 할인 적용',
                          type: 'Boundary',
                          testItem: '[경계값] 최소 주문금액(10,000원) 정액 쿠폰 적용 가능 여부 검증',
                          preconditions: '10,000원 이상 주문 시 사용 가능한 2,000원 할인 쿠폰 보유',
                          steps: '1. 상품금액 정확히 10,000원인 상태에서 쿠폰 적용 클릭\n2. 최종 결제금액 확인',
                          expected: '정상 적용되어 8,000원으로 결제금액이 계산되어야 함.',
                          actual: '',
                          status: 'Pending',
                          priority: 'Minor',
                        },
                        {
                          id: `TC-${String(maxIndex + 4).padStart(3, '0')}`,
                          reqId: `REQ-${String(reqNum).padStart(3, '0')}`,
                          category: '결제/주문',
                          featureName: '결제 네트워크 장애 대응',
                          type: 'Exception',
                          testItem: '[장애] PG사 응답 타임아웃(5초 초과) 시 자동 망취소 및 재시도 안내',
                          preconditions: 'PG사 결제 요청 승인 지연 상태 가상화',
                          steps: '1. 결제 승인 요청을 전송한다.\n2. 네트워크 지연 발생 시 화면 처리 확인',
                          expected: '망취소 전문이 자동 발송되고 사용자에게 "결제 진행 상태 확인" 안내 팝업이 노출되어야 함.',
                          actual: '',
                          status: 'Pending',
                          priority: 'Critical',
                        },
                      ];
                      onUpdateTcList([...tcList, ...sampleSet]);
                      alert('결제/주문 도메인 샘플 TC 세트 4개가 성공적으로 추가되었습니다.');
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-white rounded-xl text-[#2E1A47] flex items-center justify-between cursor-pointer border border-transparent hover:border-[#DDD0F5] transition-colors"
                  >
                    <span className="font-medium text-[#7C3AED]">📦 샘플 TC 세트 (4개) 추가</span>
                    <span className="text-[9px] bg-[#EDE9FE] text-[#7C3AED] px-1 py-0.5 rounded font-bold">+4 TC</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 툴바: 일괄 작업 + 텍스트 요약/상세 토글 + 검색 */}
      <div className="p-3 bg-[#FAF7FD] border-b border-[#ECE0F9] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* 일괄 처리 버튼 그룹 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. 체크한 항목만 적용 */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-[#DDD0F5] shadow-2xs">
            <span className="font-bold text-[#7C3AED] flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
              체크 {selectedIds.size}개:
            </span>
            <button
              type="button"
              onClick={() => handleApplySelectedStatus('PASS')}
              disabled={selectedIds.size === 0}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={selectedIds.size === 0 ? '체크박스를 1개 이상 선택해주세요' : `선택한 ${selectedIds.size}개만 PASS 처리`}
            >
              선택 PASS
            </button>
            <button
              type="button"
              onClick={() => handleApplySelectedStatus('Fail')}
              disabled={selectedIds.size === 0}
              className="px-2.5 py-1 bg-[#D83664] hover:bg-[#C22552] text-white rounded-xl font-bold shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={selectedIds.size === 0 ? '체크박스를 1개 이상 선택해주세요' : `선택한 ${selectedIds.size}개만 Fail 처리`}
            >
              선택 Fail
            </button>
            <button
              type="button"
              onClick={() => handleApplySelectedStatus('Blocker')}
              disabled={selectedIds.size === 0}
              className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl font-bold shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={selectedIds.size === 0 ? '체크박스를 1개 이상 선택해주세요' : `선택한 ${selectedIds.size}개만 Blocker 처리`}
            >
              선택 Blocker
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="px-2 py-1 text-[#D83664] hover:bg-[#FFEBF1] rounded-xl border border-[#FCD2DF] font-bold shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-0.5 cursor-pointer ml-0.5"
              title="선택한 항목 삭제"
            >
              <Trash2 className="w-3 h-3" />
              삭제
            </button>
          </div>

          {/* 2. 전체 일괄 적용 */}
          <div className="flex items-center gap-1.5 bg-[#F3ECFB] px-3 py-1.5 rounded-2xl border border-[#DDD0F5] shadow-2xs">
            <span className="font-semibold text-[#7B6891]">
              전체 일괄:
            </span>
            <button
              type="button"
              onClick={() => handleApplyAllStatus('PASS')}
              disabled={tcList.length === 0 || selectedIds.size > 0}
              className="px-2.5 py-1 bg-emerald-600/90 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={selectedIds.size > 0 ? '체크된 항목이 있을 때는 [선택 PASS]를 사용하세요' : '전체 TC를 PASS로 일괄 변경'}
            >
              전체 PASS
            </button>
            <button
              type="button"
              onClick={() => handleApplyAllStatus('Fail')}
              disabled={tcList.length === 0 || selectedIds.size > 0}
              className="px-2.5 py-1 bg-[#D83664] text-white rounded-xl font-bold hover:bg-[#B91C47] disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={selectedIds.size > 0 ? '체크된 항목이 있을 때는 [선택 Fail]을 사용하세요' : '전체 TC를 Fail로 일괄 변경'}
            >
              전체 Fail
            </button>
            <button
              type="button"
              onClick={() => handleApplyAllStatus('Blocker')}
              disabled={tcList.length === 0 || selectedIds.size > 0}
              className="px-2.5 py-1 bg-rose-800 text-white rounded-xl font-bold hover:bg-rose-900 disabled:opacity-35 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={selectedIds.size > 0 ? '체크된 항목이 있을 때는 [선택 Blocker]를 사용하세요' : '전체 TC를 Blocker로 일괄 변경'}
            >
              전체 Blocker
            </button>
          </div>
        </div>

        {/* 보기 모드 토글 & 통합 검색창 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 전체 절차/기대결과 펼치기/접기 토글 버튼 */}
          <button
            type="button"
            disabled={tcList.length === 0}
            onClick={() => setIsExpandedAll(!isExpandedAll)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#DDD0F5] bg-white text-[#6F5E82] hover:text-[#2E1A47] hover:bg-[#F3ECFB] rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            title={tcList.length === 0 ? '등록된 테스트 케이스가 없어 비활성화되었습니다' : '재현절차와 기대결과를 전체 펼치거나 요약형(2줄)으로 접습니다'}
          >
            {isExpandedAll ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>컴팩트 요약 뷰</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>상세 전체 펼치기</span>
              </>
            )}
          </button>

          {/* 통합 검색창 */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#AFA1BF]" />
            <input
              type="text"
              placeholder="통합 검색 (TC-ID, 절차, 기대/실제결과)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-[#DDD0F5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] focus:outline-none w-56 bg-white text-[#2E1A47] placeholder-[#AFA1BF] shadow-2xs transition-all"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#AFA1BF]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-[#DDD0F5] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] bg-white text-[#6F5E82] shadow-2xs font-medium cursor-pointer"
            >
              <option value="ALL">전체 상태</option>
              <option value="Pending">Pending</option>
              <option value="PASS">PASS</option>
              <option value="Fail">Fail</option>
              <option value="Blocker">Blocker</option>
              <option value="Recommend">개선사항</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
        </div>
      </div>

      {/* 대용량 테이블 영역: Fixed Header + 내부 스크롤 (max-h-[600px]) */}
      <div className="flex-1 overflow-x-auto relative">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="py-24 text-center text-[#AFA1BF] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-[#F3ECFB] border border-[#DDD0F5] flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-8 h-8 text-[#8B5CF6] stroke-1.5" />
              </div>
              <p className="text-base font-bold text-[#2E1A47]">등록된 테스트 케이스가 없습니다 ✨</p>
              <p className="text-xs text-[#7B6891] mt-1.5">
                상단의 <strong>[샘플 요구사항 CSV 자동 로드]</strong>에서 20개 또는 48개 빠른 샘플을 불러와보세요.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              {/* 고정 헤더 */}
              <thead className="bg-[#F6EFFC] sticky top-0 z-10 border-b border-[#EBDFF8] text-[#5B3D7E] font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="cursor-pointer rounded border-[#DDD0F5] text-[#8B5CF6] focus:ring-[#8B5CF6]"
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
                  <th className="py-2.5 px-2.5 min-w-[200px] text-center sticky right-0 bg-[#F1E7F8] shadow-l">
                    실행 Action / 관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EAFD]">
                {filteredList.map((tc) => {
                  const isChecked = selectedIds.has(tc.id);
                  const isBlockedByFail = tc.status === 'Blocker' && tc.actual.includes('Fail에 따른 블로킹');
                  const isRowExpanded = isExpandedAll || expandedRowIds.has(tc.id);

                  return (
                    <tr
                      key={tc.id}
                      className={`hover:bg-[#FAF6FE] transition-colors ${
                        isChecked ? 'bg-[#F3ECFB]/60' : ''
                      } ${tc.status === 'Blocker' ? 'bg-red-50/70' : ''}`}
                    >
                      {/* 행별 체크박스 */}
                      <td className="py-2 px-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(tc.id)}
                          className="cursor-pointer rounded border-[#DDD0F5] text-[#8B5CF6] focus:ring-[#8B5CF6] mt-1"
                        />
                      </td>

                      {/* TC-ID */}
                      <td className="py-2 px-2 font-mono font-medium text-[#2E1A47] text-center whitespace-nowrap align-top">
                        <span className="font-bold text-[#2E1A47]">{tc.id}</span>
                        <span className="block text-[10px] text-[#AFA1BF] font-sans">{tc.reqId}</span>
                      </td>

                      {/* 테스트 항목 및 타입 컬러 배지 */}
                      <td className="py-2 px-2.5 text-[#2E1A47] font-medium align-top">
                        <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                          {getTypeBadge(tc.type)}
                          {isBlockedByFail && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                              <Link2 className="w-2.5 h-2.5" /> 연관 Blocker
                            </span>
                          )}
                        </div>
                        <div className="text-[#2E1A47] font-medium leading-snug">{tc.testItem}</div>
                        <div className="text-[11px] text-[#7B6891] mt-0.5 flex items-center gap-1">
                          <span className="bg-[#F3ECFB] px-1 py-0.2 rounded text-[#7C3AED] font-medium border border-[#DDD0F5]">
                            {tc.category}
                          </span>
                          <span className="truncate max-w-[120px]">{tc.featureName}</span>
                        </div>
                      </td>

                      {/* 사전조건 (컴팩트 뷰 적용) */}
                      <td className="py-2 px-2.5 text-[#6F5E82] leading-relaxed align-top">
                        <div className={isRowExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                          {tc.preconditions}
                        </div>
                      </td>

                      {/* 재현 절차 */}
                      <td className="py-2 px-2.5 text-[#6F5E82] font-mono text-[11px] leading-relaxed align-top">
                        <div className={isRowExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                          {tc.steps}
                        </div>
                        {tc.steps && tc.steps.length > 40 && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(tc.id)}
                            className="text-[10px] text-[#8B5CF6] hover:underline mt-0.5 inline-block font-sans cursor-pointer"
                          >
                            {isRowExpanded ? '접기 ▲' : '자세히 보기 ▼'}
                          </button>
                        )}
                      </td>

                      {/* 기대 결과 */}
                      <td className="py-2 px-2.5 text-[#6F5E82] leading-relaxed align-top">
                        <div className={isRowExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}>
                          {tc.expected}
                        </div>
                        {tc.expected && tc.expected.length > 40 && (
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(tc.id)}
                            className="text-[10px] text-[#8B5CF6] hover:underline mt-0.5 inline-block cursor-pointer"
                          >
                            {isRowExpanded ? '접기 ▲' : '자세히 보기 ▼'}
                          </button>
                        )}
                      </td>

                      {/* 실제 결과 */}
                      <td className="py-2 px-2.5 align-top">
                        <input
                          type="text"
                          value={tc.actual}
                          placeholder="결과 입력 (상태 자동)"
                          onChange={(e) => handleUpdateActualWithAutoStatus(tc.id, e.target.value)}
                          className={`w-full px-2 py-1 text-xs border rounded-xl focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none mb-1 transition-colors ${
                            tc.status === 'PASS' 
                              ? 'border-emerald-300 bg-emerald-50/30' 
                              : tc.status === 'Fail' 
                              ? 'border-rose-300 bg-rose-50/30' 
                              : tc.status === 'Blocker'
                              ? 'border-red-400 bg-red-50/50 font-medium text-red-800'
                              : 'border-[#DDD0F5] bg-white'
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
                            title="Fail 설정"
                          >
                            +오동작(Fail)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateActualWithAutoStatus(tc.id, '치명적 결함 발생: 500 에러')}
                            className="text-[10px] bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-[#DDD0F5] px-1 py-0.5 rounded font-medium cursor-pointer"
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
                            onChange={(e) => handleUpdateStatus(tc.id, e.target.value as TCStatus)}
                            className="text-[11px] border border-[#DDD0F5] rounded-lg px-1 py-0.5 text-[#2E1A47] mt-1 bg-white cursor-pointer hover:border-[#8B5CF6] disabled:bg-[#FAF7FD] disabled:text-[#AFA1BF] disabled:cursor-not-allowed"
                          >
                            <option value="Pending">Pending</option>
                            <option value="PASS">PASS</option>
                            <option value="Fail">Fail</option>
                            <option value="Blocker">Blocker</option>
                            <option value="Recommend">개선사항</option>
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
                            className="text-[11px] border border-[#DDD0F5] rounded-lg px-1 py-0.5 text-[#2E1A47] mt-1 bg-white cursor-pointer disabled:bg-[#FAF7FD] disabled:text-[#AFA1BF] disabled:cursor-not-allowed hover:border-[#8B5CF6]"
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
                            className={`inline-flex items-center gap-0.5 px-1.5 py-1 border rounded-lg font-semibold text-[11px] transition-colors ${
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
                            className={`inline-flex items-center gap-0.5 px-1.5 py-1 border rounded-lg font-semibold text-[11px] transition-colors ${
                              tc.status === 'N/A' || tc.priority === 'Recommend'
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                : tc.status === 'Fail'
                                ? 'bg-[#D83664] text-white border-[#D83664] shadow-xs cursor-pointer'
                                : 'bg-[#FFEBF1] text-[#D83664] hover:bg-[#D83664] hover:text-white border-[#FCD2DF] cursor-pointer'
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
                            className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg font-semibold text-[11px] shadow-sm transition-colors ${
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
                          <div className="flex items-center gap-0.5 ml-1 border-l border-[#EADBF8] pl-1">
                            <button
                              type="button"
                              onClick={() => setEditingTc(tc)}
                              className="p-1 text-[#AFA1BF] hover:text-[#8B5CF6] hover:bg-[#F3ECFB] rounded-lg cursor-pointer"
                              title="수정"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(tc.id)}
                              className="p-1 text-[#AFA1BF] hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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
      <div className="p-3.5 bg-gradient-to-r from-[#FAF6FD] to-[#F3ECFB] border-t border-[#ECE0F9] text-xs text-[#7B6891] flex flex-wrap justify-between items-center gap-2 font-medium">
        <span>
          전체 <strong className="text-[#2E1A47]">{tcList.length}</strong>개 TC 중 <strong className="text-[#2E1A47]">{filteredList.length}</strong>개 표시 (선택: <span className="text-[#7C3AED] font-bold">{selectedIds.size}</span>개)
        </span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            PASS: {tcList.filter((t) => t.status === 'PASS').length}
          </span>
          <span className="flex items-center gap-1 text-rose-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
            Fail: {tcList.filter((t) => t.status === 'Fail').length}
          </span>
          <span className="flex items-center gap-1 text-red-600 font-black">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-ping"></span>
            Blocker: {tcList.filter((t) => t.status === 'Blocker').length}
          </span>
          <span className="flex items-center gap-1 text-[#7C3AED] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6] inline-block"></span>
            개선사항: {tcList.filter((t) => t.status === 'Recommend').length}
          </span>
        </div>
      </div>

      {/* TC 수정 모달 */}
      {editingTc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#EADBF8] animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3.5 border-b border-[#ECE0F9] mb-4">
              <h3 className="font-bold text-[#2E1A47] text-base flex items-center gap-2">
                <div className="p-1.5 bg-[#F3ECFB] rounded-xl text-[#7C3AED]">
                  <Edit className="w-4 h-4" />
                </div>
                <span>테스트 케이스 수정 [{editingTc.id}]</span>
              </h3>
              <button
                onClick={() => setEditingTc(null)}
                className="text-[#AFA1BF] hover:text-[#2E1A47] cursor-pointer p-1 rounded-xl hover:bg-[#F3ECFB] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#2E1A47] mb-1.5">테스트 항목</label>
                <input
                  type="text"
                  value={editingTc.testItem}
                  onChange={(e) => setEditingTc({ ...editingTc, testItem: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] focus:outline-none text-[#2E1A47] shadow-2xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1.5">사전조건</label>
                  <textarea
                    rows={3}
                    value={editingTc.preconditions}
                    onChange={(e) => setEditingTc({ ...editingTc, preconditions: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] focus:outline-none text-[#2E1A47] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1.5">재현 절차</label>
                  <textarea
                    rows={3}
                    value={editingTc.steps}
                    onChange={(e) => setEditingTc({ ...editingTc, steps: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] focus:outline-none text-[#2E1A47] shadow-2xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1.5">기대 결과</label>
                  <textarea
                    rows={2}
                    value={editingTc.expected}
                    onChange={(e) => setEditingTc({ ...editingTc, expected: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] focus:outline-none text-[#2E1A47] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1.5">실제 결과</label>
                  <textarea
                    rows={2}
                    value={editingTc.actual}
                    onChange={(e) => setEditingTc({ ...editingTc, actual: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] focus:outline-none text-[#2E1A47] shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1.5">상태</label>
                  <select
                    value={editingTc.status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as TCStatus;
                      let nextPriority = editingTc.priority;
                      if (nextStatus === 'PASS' || nextStatus === 'N/A') {
                        nextPriority = 'None';
                      } else if (nextStatus === 'Recommend') {
                        nextPriority = 'Recommend';
                      } else if (nextStatus === 'Blocker') {
                        nextPriority = 'Critical';
                      }
                      setEditingTc({
                        ...editingTc,
                        status: nextStatus,
                        priority: nextPriority,
                      });
                    }}
                    className="w-full px-3 py-2 border border-[#DDD0F5] rounded-xl text-xs bg-white text-[#2E1A47] shadow-2xs focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="PASS">PASS</option>
                    <option value="Fail">Fail</option>
                    <option value="Blocker">Blocker</option>
                    <option value="Recommend">개선사항</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1.5">결함 우선순위</label>
                  <select
                    value={editingTc.priority}
                    disabled={editingTc.status === 'PASS' || editingTc.status === 'N/A'}
                    onChange={(e) => setEditingTc({ ...editingTc, priority: e.target.value as TCPriority })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] rounded-xl text-xs bg-white text-[#2E1A47] shadow-2xs disabled:bg-[#FAF7FD] disabled:text-[#AFA1BF] focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]"
                  >
                    <option value="None">None (면제)</option>
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Recommend">Recommend</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#ECE0F9] mt-4">
                <button
                  type="button"
                  onClick={() => setEditingTc(null)}
                  className="px-4 py-2 rounded-xl bg-[#F3ECFB] hover:bg-[#EBDDF9] text-[#6F5E82] font-bold cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#9F7AEA] to-[#7C3AED] hover:from-[#906BE0] hover:to-[#6D28D9] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-200/50 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TC 추가 모달 (한 개 직접 추가 / 다수 일괄 추가) */}
      {showAddTcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-[0_20px_50px_rgba(180,150,230,0.22)] border border-[#EADBF8] animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3.5 border-b border-[#ECE0F9] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#906FE7] to-[#C4B5FD] text-white flex items-center justify-center shadow-md shadow-purple-200/60">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#2E1A47] text-base">
                    테스트 케이스 신규 추가 ✨
                  </h3>
                  <p className="text-xs text-[#7B6891]">
                    {addMode === 'single' ? '한 개의 테스트 케이스를 직접 등록합니다' : 'CSV 텍스트 또는 줄 단위로 다수의 TC를 일괄 등록합니다'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTcModal(false)}
                className="w-8 h-8 rounded-full bg-[#F3ECFB] hover:bg-[#EBDDF9] text-[#7B6891] hover:text-[#2E1A47] flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 탭 전환: 한 개 추가 vs 다수 추가 */}
            <div className="flex p-1 bg-[#F1E8FB] rounded-2xl mb-4 border border-[#E3D3F7] text-xs">
              <button
                type="button"
                onClick={() => setAddMode('single')}
                className={`flex-1 py-2 font-black text-center rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  addMode === 'single'
                    ? 'bg-white text-[#7C3AED] shadow-xs'
                    : 'text-[#7B6891] hover:text-[#2E1A47]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                TC 1개 추가 (상세 폼)
              </button>
              <button
                type="button"
                onClick={() => setAddMode('bulk')}
                className={`flex-1 py-2 font-black text-center rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  addMode === 'bulk'
                    ? 'bg-white text-[#7C3AED] shadow-xs'
                    : 'text-[#7B6891] hover:text-[#2E1A47]'
                }`}
              >
                <FilePlus className="w-3.5 h-3.5" />
                TC 다수 추가 (CSV / 텍스트 일괄)
              </button>
            </div>

            {/* Mode 1: TC 한 개 등록 폼 */}
            {addMode === 'single' ? (
              <form onSubmit={handleAddSingleTc} className="space-y-3 text-xs">
                {/* 샘플 데이터 자동 채우기 빠른 버튼 */}
                <div className="flex items-center justify-between bg-[#FAF7FD] p-2.5 rounded-2xl border border-[#E8DCF7]">
                  <span className="text-xs font-bold text-[#7C3AED] flex items-center gap-1">
                    ✨ 샘플 데이터 채우기:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSingleTcForm({
                          category: '회원/인증',
                          featureName: '소셜 로그인',
                          type: 'Positive',
                          testItem: '[정상] 카카오 간편 로그인 성공 후 세션 유지 검증',
                          preconditions: '카카오 계정 보유 및 브라우저 쿠키 허용 상태',
                          steps: '1. 로그인 페이지에서 [카카오 로그인] 클릭\n2. 사용자 인증 및 인가 완료',
                          expected: '정상 로그인 처리 후 메인 홈으로 리다이렉트되어야 함.',
                          priority: 'Major',
                        });
                      }}
                      className="px-2.5 py-1 bg-white border border-[#DDD0F5] rounded-xl text-xs text-[#6F5E82] hover:bg-[#F3ECFB] hover:text-[#7C3AED] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      회원가입/인증 샘플
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSingleTcForm({
                          category: '결제/정산',
                          featureName: '신용카드 결제',
                          type: 'Positive',
                          testItem: '[정상] 카드 결제 승인 후 주문번호 생성 및 알림톡 발송',
                          preconditions: '장바구니 1건 이상 담긴 상태',
                          steps: '1. 결제 수단 카드 선택\n2. CVC 및 인증번호 입력 후 결제하기 클릭',
                          expected: 'PG 승인 완료 토스트 및 주문 완료 화면 전환',
                          priority: 'Critical',
                        });
                      }}
                      className="px-2.5 py-1 bg-white border border-[#DDD0F5] rounded-xl text-xs text-[#6F5E82] hover:bg-[#F3ECFB] hover:text-[#7C3AED] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      결제/주문 샘플
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSingleTcForm({
                          category: '배송/물류',
                          featureName: '배송지 관리',
                          type: 'Negative',
                          testItem: '[예외] 우편번호 미입력 시 유효성 에러 메시지 노출 검증',
                          preconditions: '새 배송지 추가 모달 노출 상태',
                          steps: '1. 상세주소만 입력하고 우편번호 검색 생략 후 저장 클릭',
                          expected: '우편번호 필수 입력 경고 및 저장 요청 차단',
                          priority: 'Minor',
                        });
                      }}
                      className="px-2.5 py-1 bg-white border border-[#DDD0F5] rounded-xl text-xs text-[#6F5E82] hover:bg-[#F3ECFB] hover:text-[#7C3AED] font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      예외/유효성 샘플
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2E1A47] mb-1">대분류 (카테고리)</label>
                    <input
                      type="text"
                      placeholder="예: 회원/인증, 결제, 상품검색"
                      value={singleTcForm.category}
                      onChange={(e) => setSingleTcForm({ ...singleTcForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#2E1A47] mb-1">기능명</label>
                    <input
                      type="text"
                      placeholder="예: 소셜 로그인 연동"
                      value={singleTcForm.featureName}
                      onChange={(e) => setSingleTcForm({ ...singleTcForm, featureName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2E1A47] mb-1">테스트 유형</label>
                    <select
                      value={singleTcForm.type}
                      onChange={(e) => setSingleTcForm({ ...singleTcForm, type: e.target.value as TestCase['type'] })}
                      className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all cursor-pointer"
                    >
                      <option value="Positive">🟢 Positive (정상 플로우)</option>
                      <option value="Negative">🔴 Negative (예외/검증 실패)</option>
                      <option value="Boundary">🟡 Boundary (경계값 검증)</option>
                      <option value="Exception">🔵 Exception (시스템 장애/타임아웃)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#2E1A47] mb-1">기본 결함 우선순위</label>
                    <select
                      value={singleTcForm.priority}
                      onChange={(e) => setSingleTcForm({ ...singleTcForm, priority: e.target.value as TCPriority })}
                      className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all cursor-pointer"
                    >
                      <option value="Critical">Critical (치명적 결함)</option>
                      <option value="Major">Major (주요 기능 결함)</option>
                      <option value="Minor">Minor (경미한 결함/UI)</option>
                      <option value="Recommend">Recommend (개선 권장)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1">테스트 항목 (제목)</label>
                  <input
                    type="text"
                    placeholder="예: [정상] 카카오 간편 로그인 성공 후 마이페이지 진입 검증"
                    value={singleTcForm.testItem}
                    onChange={(e) => setSingleTcForm({ ...singleTcForm, testItem: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#2E1A47] mb-1">사전 조건</label>
                    <textarea
                      rows={2}
                      placeholder="예: 카카오 계정을 보유하고 로그인 화면에 진입한 상태"
                      value={singleTcForm.preconditions}
                      onChange={(e) => setSingleTcForm({ ...singleTcForm, preconditions: e.target.value })}
                      className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#2E1A47] mb-1">재현 절차</label>
                    <textarea
                      rows={2}
                      placeholder="1. 카카오 로그인 버튼 클릭&#10;2. 계정 인증 완료"
                      value={singleTcForm.steps}
                      onChange={(e) => setSingleTcForm({ ...singleTcForm, steps: e.target.value })}
                      className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#2E1A47] mb-1">기대 결과</label>
                  <textarea
                    rows={2}
                    placeholder="예: 로그인 완료 토스트가 노출되고 메인 대시보드로 이동해야 함."
                    value={singleTcForm.expected}
                    onChange={(e) => setSingleTcForm({ ...singleTcForm, expected: e.target.value })}
                    className="w-full px-3 py-2 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#ECE0F9] mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTcModal(false)}
                    className="px-4 py-2 rounded-2xl bg-[#F3ECFB] hover:bg-[#EBDDF9] text-[#6F5E82] font-bold transition-all cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[#9F7AEA] via-[#8B5CF6] to-[#7C3AED] hover:from-[#906BE0] hover:to-[#6D28D9] text-white font-black shadow-md shadow-purple-200/60 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    TC 1개 추가 완료
                  </button>
                </div>
              </form>
            ) : (
              /* Mode 2: TC 다수 추가 (CSV / 텍스트 붙여넣기) */
              <form onSubmit={handleAddBulkCsvText} className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-[#2E1A47]">
                      다수 TC 데이터 붙여넣기 (CSV 포맷 또는 줄바꿈 텍스트)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkCsvText(
`대분류,기능명,요구사항 상세 내용,수용 조건 (Acceptance Criteria),우선순위
인증,소셜 로그인,카카오 간편 로그인 지원,로그인 성공 및 토큰 발급,Major
주문,쿠폰 적용,결제 시 할인 쿠폰 적용,쿠폰 할인 금액 차감 검증,Critical
배송,배송지 조회,기본 배송지 목록 조회,저장된 주소 목록 노출,Minor`
                        );
                      }}
                      className="text-xs text-[#7C3AED] hover:underline font-bold cursor-pointer"
                    >
                      ✨ 예시 데이터 채우기
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    placeholder={`[지원 형식 1] 표준 CSV (헤더 포함):
대분류,기능명,요구사항 상세 내용,수용 조건 (Acceptance Criteria),우선순위
인증,소셜 로그인,카카오 로그인 지원,토큰 발급 성공,Major

[지원 형식 2] 단순 줄바꿈 (기능명, 항목명, 기대결과):
소셜 로그인, 카카오 로그인 성공 검증, 토스트 노출 및 마이페이지 이동
비밀번호 재설정, 이메일 링크 발송 검증, 2분 내 발송 완료`}
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#DDD0F5] bg-[#FAF8FD] rounded-xl font-mono text-xs text-[#2E1A47] placeholder:text-[#AFA1BF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all"
                    required
                  />
                  <p className="text-xs text-[#7B6891] mt-1">
                    * 표준 CSV 헤더(대분류, 기능명 등)가 있으면 1개 요구사항당 4종(Positive/Negative/Boundary/Exception)의 TC가 자동 생성됩니다.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#ECE0F9] mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTcModal(false);
                      appendFileInputRef.current?.click();
                    }}
                    className="text-xs text-[#7C3AED] hover:underline font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    CSV 파일 직접 선택하여 추가하기
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTcModal(false)}
                      className="px-4 py-2 rounded-2xl bg-[#F3ECFB] hover:bg-[#EBDDF9] text-[#6F5E82] font-bold transition-all cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[#9F7AEA] via-[#8B5CF6] to-[#7C3AED] hover:from-[#906BE0] hover:to-[#6D28D9] text-white font-black shadow-md shadow-purple-200/60 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      다수 TC 일괄 등록
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
