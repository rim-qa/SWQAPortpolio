export type TCStatus = 'Pending' | 'PASS' | 'Fail' | 'Recommend' | 'Blocker' | 'N/A';
export type TCPriority = 'Critical' | 'Major' | 'Minor' | 'Recommend' | 'None';

export interface TestCase {
  id: string; // e.g. TC-001
  reqId: string; // e.g. REQ-ECO-001
  category: string; // 대분류
  featureName: string; // 기능명
  testItem: string; // 테스트 항목
  type: 'Positive' | 'Negative' | 'Exception'; // TC 유형
  preconditions: string; // 사전조건
  steps: string; // 재현 절차
  expected: string; // 기대 결과
  actual: string; // 실제 결과
  status: TCStatus; // 상태
  priority: TCPriority; // 결함 우선순위
}
