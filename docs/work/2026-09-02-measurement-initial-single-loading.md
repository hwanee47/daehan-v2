# 결과 입력 최초 로딩 단일화

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-09-02
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-09-02

## 배경과 목적

결과 입력 탭 최초 진입 시 기본 측정 데이터를 불러온 뒤 최근 작업 성적서를 다시 조회해 로딩 상태가 연속으로 두 번 보인다. 사용자가 하나의 화면을 두 번 기다리는 느낌을 받지 않도록 최초 데이터와 최근 작업 Top 5를 같은 초기 로딩에서 함께 준비한다.

## 범위

### 포함

- 작업영역 패널 초기 로더에서 측정 데이터와 최근 작업 Top 5를 병렬 조회
- 직접 URL에서도 두 데이터를 병렬 조회
- `InspectionMeasurementSheet`가 초기 최근 작업 결과를 받아 즉시 카드 표시
- 초기 결과가 제공되지 않은 재사용 경로에서만 기존 지연 조회를 fallback으로 유지
- 최근 작업 영역을 사용하지 않는 화면에서는 불필요한 Top 5 조회 방지

### 제외

- 최근 작업 Top 5 선정 기준과 SQL 변경
- 카드 UI와 스와이프 동작 변경
- 캐시 정책, DB schema, RLS 변경

## 완료 조건

- [x] 결과 입력 최초 로딩이 끝나면 최근 작업 카드가 추가 로딩 없이 바로 표시된다.
- [x] 직접 URL과 탭 작업영역에서 동일한 초기 결과를 전달한다.
- [x] 성적서 관리에서 결과 입력으로 전달된 성적서는 기존 선택 흐름을 유지한다.
- [x] 최근 작업 조회 실패 시 전체 화면을 막지 않고 카드 영역에 오류 상태가 표시된다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/page.tsx`, `workspace-data-actions.ts`, `workspace-panels.tsx`, `inspection-measurement-sheet.tsx`
- 관련 Supabase table/bucket: 기존 `inspection_measurement_runs`, `inspection_reports` 읽기만 재사용
- 재사용할 기존 패턴: `Promise.all`, `getRecentWorkedReports`, workspace loader result
- 문서와 구현의 차이: 현재 workspace loader는 `getInspectionReportData`만 기다리고, 최근 작업은 Client Component의 `useEffect`에서 추가 조회한다.

## 설계

### UI와 반응형

- 모든 너비: 초기 로딩 상태 한 번 뒤 최근 작업 카드 또는 해당 오류/빈 상태를 표시
- 로딩/빈 상태/오류/권한: 최근 작업 조회 오류는 전체 측정 데이터 로딩 성공을 무효화하지 않음
- 접근성: 중복 `aria-live` 로딩 안내 제거

### Server/Client 경계

- Server Component/Action: 초기 로더가 측정 데이터와 최근 작업 결과를 병렬 조회
- Client Component/Zustand: 전달받은 결과로 초기 state 구성, fallback 조회만 유지

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: 해당 없음

## 변경 계획

1. 초기 로더 반환형에 최근 작업 결과를 포함한다.
2. 직접 URL과 작업영역 패널에서 초기 결과를 전달한다.
3. 측정결과 컴포넌트의 초기 state와 fallback 조회 조건을 조정한다.
4. 중복 조회 여부와 직접 URL·탭 패널 동작을 검증한다.

## 위험과 승인 사항

- DB query 호출 시점과 workspace loader 반환형을 변경하는 Standard 작업이므로 구현 전 승인이 필요하다.
- 두 조회는 직렬이 아니라 병렬로 실행해 초기 대기시간 증가를 최소화한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 직접 URL 최초 진입
- [ ] 탭 패널 최초 진입
- [ ] 최근 작업 빈 상태/오류 상태
- [ ] 성적서 관리에서 결과 입력 이동
- [x] 프로덕션 빌드

## 결과

- 변경: 직접 URL과 workspace loader에서 기본 측정 데이터와 최근 작업 Top 5를 병렬 조회하고, 결과 입력 컴포넌트의 초기 state로 전달함. 초기 결과가 없고 최근 목록을 사용하는 재사용 경로에서만 fallback 조회함.
- 검증: ESLint, TypeScript, Next.js production build 통과
- 미실행: 로그인된 브라우저에서 네트워크 요청과 로딩 전환을 직접 관찰하지 못함
- 남은 위험/후속 작업: 실제 로그인 세션에서 최초 진입 시 카드 영역의 추가 로딩 문구가 나타나지 않는지 확인
