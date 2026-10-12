import { TestCase, TCPriority } from '@/types/testCase';

export interface RawRequirementRow {
  '요구사항 ID'?: string;
  '대분류'?: string;
  '기능명'?: string;
  '요구사항 상세 내용'?: string;
  '수용 조건 (Acceptance Criteria)'?: string;
  '우선순위'?: string;
  [key: string]: any;
}

export function generateTestCasesFromRequirements(rows: RawRequirementRow[]): TestCase[] {
  const testCases: TestCase[] = [];
  let tcIndex = 1;

  rows.forEach((row) => {
    // 필드 유연하게 가져오기 (컬럼 헤더명 매핑)
    const reqId = row['요구사항 ID'] || row['ID'] || row['reqId'] || `REQ-${String(tcIndex).padStart(3, '0')}`;
    const category = row['대분류'] || row['카테고리'] || '일반';
    const featureName = row['기능명'] || row['기능'] || '기능 테스트';
    const detail = row['요구사항 상세 내용'] || row['상세설명'] || row['설명'] || `${featureName}에 대한 상세 기능 동작 검증`;
    const acceptance = row['수용 조건 (Acceptance Criteria)'] || row['수용조건'] || '정상 처리 및 예외 상황 대응';
    
    // 원본 우선순위 매핑
    const rawPriority = (row['우선순위'] || 'Major').trim();
    let basePriority: TCPriority = 'Major';
    if (['Critical', '크리티컬', '긴급'].includes(rawPriority)) basePriority = 'Critical';
    else if (['Minor', '마이너', '낮음'].includes(rawPriority)) basePriority = 'Minor';
    else if (['Recommend', '권장', '개선'].includes(rawPriority)) basePriority = 'Recommend';
    else basePriority = 'Major';

    // 1. Positive Test Case (정상 동작)
    testCases.push({
      id: `TC-${String(tcIndex++).padStart(3, '0')}`,
      reqId,
      category,
      featureName,
      type: 'Positive',
      testItem: `[정상] ${featureName} 정상 수행 및 응답 검증`,
      preconditions: `사용자가 [${category}] 관련 메뉴에 진입하여 정상 인증 및 접근 권한을 보유한 상태`,
      steps: `1. ${featureName} 메뉴/버튼을 선택한다.\n2. 유효한 입력값을 입력하거나 요청을 트리거한다.\n3. 수행 결과를 확인한다.`,
      expected: `정상 처리 메시지/토스트가 표시되고 요청 결과가 반영되며 시스템 상태가 정상 갱신되어야 함.`,
      actual: '',
      status: 'Pending',
      priority: basePriority,
    });

    // 2. Negative Test Case (유효성 검증 및 비정상 입력)
    testCases.push({
      id: `TC-${String(tcIndex++).padStart(3, '0')}`,
      reqId,
      category,
      featureName,
      type: 'Negative',
      testItem: `[예외/입력] ${featureName} 필수값 누락 및 비정상 입력 시 유효성 검증`,
      preconditions: `사용자가 [${category}] 화면에서 입력 폼 또는 실행 컨트롤에 접근한 상태`,
      steps: `1. 필수 입력 항목을 공백으로 두거나 비정상적인 포맷의 값을 입력한다.\n2. 실행 또는 저장 버튼을 클릭한다.`,
      expected: `해당 필드에 명확한 Validation 경고 안내가 노출되고, 백엔드로의 잘못된 요청 전송이 차단되어야 함.`,
      actual: '',
      status: 'Pending',
      priority: basePriority === 'Critical' ? 'Critical' : 'Major',
    });

    // 3. Exception Test Case (네트워크/통신 에러 및 시스템 한계치)
    testCases.push({
      id: `TC-${String(tcIndex++).padStart(3, '0')}`,
      reqId,
      category,
      featureName,
      type: 'Exception',
      testItem: `[예외/환경] ${featureName} 네트워크 단절/타임아웃 시 롤백 및 에러 핸들링`,
      preconditions: `네트워크 지연(Slow 3G) 또는 서버 500 에러 모의 환경`,
      steps: `1. ${featureName} 요청을 트리거하는 도중 네트워크를 차단하거나 타임아웃을 유발한다.\n2. 재시도 버튼 및 화면 처리 결과를 확인한다.`,
      expected: `사용자에게 통신 실패 에러 안내 토스트가 노출되며, 화면이 멈추거나 튕기지 않고 이전 상태를 온전히 유지해야 함.`,
      actual: '',
      status: 'Pending',
      priority: 'Major',
    });

    // 4. Boundary / Security / 권한 Case (추가 케이스: 3~4개 생성 조건 충족)
    testCases.push({
      id: `TC-${String(tcIndex++).padStart(3, '0')}`,
      reqId,
      category,
      featureName,
      type: 'Negative',
      testItem: `[보안/권한] ${featureName} 미인가 사용자 접근 차단 및 토큰 만료 검증`,
      preconditions: `세션이 만료되었거나 비인가 상태의 클라이언트 세션`,
      steps: `1. 세션 만료 후 직접 URL 접근 또는 ${featureName} API 호출을 시도한다.`,
      expected: `접근이 즉시 차단되고 로그인 페이지로 리다이렉트되거나 401/403 권한 오류가 적절히 안내되어야 함.`,
      actual: '',
      status: 'Pending',
      priority: 'Minor',
    });
  });

  return testCases;
}
