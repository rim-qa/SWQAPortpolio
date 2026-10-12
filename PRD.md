# Q-Safe (Quality + Safe) 제품 요구사항 문서 (최종본: 실제 데이터 파싱 및 상태 연동형)

#### 1. 제품 개요

Q-Safe는 QA 엔지니어의 TC 작성 시간 단축과 릴리즈 현황의 실시간 공유를 위한 대시보드입니다. 기획/요구사항 CSV 파일을 업로드하면 앱이 데이터를 직접 읽어들여 요구사항당 3~4개의 TC를 자동 생성(100~300개 규모)하며, 이 TC의 실행 결과가 우측의 현황판에 즉각 반영되는 데이터 연동형(Lifting State Up) 프로토타입으로 동작합니다.

#### 2. 화면 구조 및 상태(State) 관리

* 두 카드(컴포넌트)는 최상위 부모 페이지(`app/page.tsx`)에서 전역 상태(Global State)를 공유합니다.
* **공유되는 주요 데이터:**
  * `tcList`: CSV에서 추출되어 생성된 대용량 TC 목록 및 각각의 상태 (`Pending`, `PASS`, `Fail`, `Blocker`)
  * `isBlocked`: 대시보드 전체의 Critical 알림 상태 (Boolean)

#### 3. 기능 상세 요구사항

**3.1. [카드 1] AI TC 자동 생성기 및 실행기 (TcGeneratorCard)**  
단순한 화면 UI를 넘어, 실제 데이터를 읽고 실행할 수 있는 컨트롤 타워 역할을 합니다.

* **실제 데이터 파싱 (CSV 업로드):**
  * 사용자가 요구사항 CSV 파일을 업로드하면 앱 내부에서 파일(FileReader/PapaParse 등)을 읽어들입니다.
  * 각 요구사항(Row) 데이터를 바탕으로 Positive, Negative, Exception 등 3~4개의 TC를 동적으로 파생시켜, 총 100~300개 규모의 TC 리스트를 자동 생성합니다.
* **실무형 대용량 테이블 구성:**
  * 컬럼: TC-ID, 테스트 항목, 사전조건, 재현 절차, 기대 결과, 실제 결과, 상태, 결함 우선순위
  * 데이터가 많아도 UI가 깨지지 않도록 헤더 고정(Fixed Header) 및 내부 스크롤 처리.
* **실행 (Action 버튼 추가):**
  * 각 행 마지막에 `[PASS]`, `[Fail]`, `[Blocker]` 버튼 노출.
  * 클릭 시 해당 행의 상태 업데이트. 특정 TC에서 `Blocker` 처리 시 전체 앱이 'Critical(위험)' 상태로 전환됨.

**3.2. [카드 2] 실시간 릴리즈 현황 및 긴급 제어 (ReleaseBoardCard)**  
카드 1의 방대한 조작 결과(데이터)를 실시간으로 연산하여 시각화하는 현황판입니다.

* **실시간 진행률 계산:**
  * 공식: `((PASS + Fail + Blocker 처리된 TC 수) / 전체 생성된 TC 수) * 100` 을 적용하여 프로그레스 바(%) 렌더링.
  * PASS, Fail, Blocker 등의 누적 통계 수치 실시간 표기.
* **Blocker 동기화 (Hotfix 전파):**
  * 카드 1에서 `Blocker` 처리되거나, 카드 2의 `🚨 긴급 Blocker / Hotfix` 버튼 클릭 시 `isBlocked`가 True로 전환됨.
  * 즉시 Red 테마 전환, 모달 경고창 노출, 토스트 알림("[Slack] Hotfix request broadcasted.") 발생.
* **상황 해제:** 에러 해결 후 '상황 해제(Resolve Issue)'를 누르면 다시 Green 테마로 복구됨.

---

#### 4. AI 코딩 도구(Antigravity 등) 전용 프롬프트

```plaintext
Build a responsive Next.js App Router QA Dashboard named 'Q-Safe'. 
Use Tailwind CSS, TypeScript, lucide-react for icons, and shadcn/ui.

CRITICAL REQUIREMENT 1: LIFT STATE UP
The application must manage the shared state in `app/page.tsx` and pass props down to `TcGeneratorCard` and `ReleaseBoardCard`. The two cards MUST interact with each other in real-time.

Shared States in page.tsx:
1. `tcList`: Array of objects representing Test Cases. Initial state is empty.
2. `isBlocked`: Boolean (default: false).

CRITICAL REQUIREMENT 2: ACTUAL CSV PARSING & DYNAMIC TC GENERATION
Card 1: AI TC Generator & Runner (Left)
- Has an "Upload Requirements CSV" button that ACTUALLY reads and parses the uploaded CSV file (e.g., using FileReader or PapaParse).
- When a CSV is uploaded, read the data rows. For EACH row in the CSV, automatically generate 3 to 4 Test Cases (Positive, Negative, Exception) based on the row's content (like '요구사항 명' and '상세 설명').
- Example: If the uploaded CSV has 50 requirements, it must dynamically generate ~150 Test Cases in the `tcList` state.
- IMPORTANT TABLE COLUMNS:
  1. TC-ID (e.g. TC-001)
  2. 테스트 항목 (Test Item - dynamically generated based on CSV content)
  3. 사전조건 (Preconditions)
  4. 재현 절차 (Steps)
  5. 기대 결과 (Expected)
  6. 실제 결과 (Actual - text input or blank)
  7. 상태 (Select/Badge: PASS, Fail, Recommend, Blocker, N/A, Pending)
  8. 결함 우선순위 (Select/Badge: Critical, Major, Minor, Recommend)
- TABLE UI: The table must have a fixed header and a scrollable body (max-h-[600px]) to handle 100~300 rows smoothly.
- ACTION: Render action buttons [PASS], [Fail], [Blocker] at the end of each row. 
  - Clicking [PASS]/[Fail] updates the '상태' column of that row.
  - Clicking [Blocker] updates the '상태' to 'Blocker', sets '결함 우선순위' to 'Critical', AND sets global `isBlocked` to true.

Card 2: Real-time Release Board (Right)
- Calculates real-time progress: `((PASS + Fail + Blocker count) / Total TC count) * 100`. 
- Displays a prominent Progress Bar based on the calculated percentage.
- Display summary stats: Total, PASS, Fail, Blocker, N/A counts.
- Contains a "🚨 Critical Blocker" button. Clicking it sets global `isBlocked` to true.
- If `isBlocked` is true:
  1. Change the background of Card 2 to soft red (`bg-red-50`) and progress bar to red.
  2. Trigger a Warning Modal: "Critical Defect Found: Testing Halted & Hotfix Required".
  3. Trigger a Toast notification: "[Slack] Hotfix request broadcasted."
  4. Provide a "Resolve Issue" button to set `isBlocked` to false and return to the normal Green theme.

Make sure the UI is split into a 2-grid layout on desktop (`md:grid-cols-2`). Add a "Reset Dashboard" button to clear data for repeated demos.
```
