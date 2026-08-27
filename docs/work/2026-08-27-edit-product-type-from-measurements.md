# 측정결과 화면 제품구분 수정

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-27
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인`, 2026-08-27

## 배경과 목적

측정결과 입력 화면에서 성적서 마스터에 저장된 제품구분을 초기값으로 보여주고, 측정 담당자가 제품구분을 수정해 측정결과와 함께 저장할 수 있게 한다.

## 범위

### 포함

- 성적서별 `product_type_code_seq`를 체크박스 초기값으로 사용
- `U0002` 제품구분 체크박스를 측정 화면에서 수정 가능하게 변경
- 단일 선택 체크박스 동작과 선택 해제 지원
- 측정결과 저장 시 `inspection_reports.product_type_code_seq` 갱신
- 성적서 전환 전까지 성적서별 수정 상태 유지

### 제외

- 제품구분 다중 선택 저장
- DB schema, RLS, 공통코드 데이터 또는 migration 변경
- 성적서 관리 화면의 select UI 변경

## 완료 조건

- [x] 측정 화면 진입 시 마스터의 제품구분이 체크되어 보인다.
- [x] 다른 제품구분을 체크하면 기존 체크가 해제된다.
- [x] 현재 체크된 제품구분을 다시 누르면 선택 없음으로 바뀐다.
- [x] 측정결과 저장 시 제품구분과 측정값이 함께 저장된다.
- [x] 저장 후 성적서 관리와 측정 화면 재조회에 수정값이 반영된다.

## 현재 구현 조사

- 관련 route/component: `inspection-measurements/inspection-measurement-sheet.tsx`, `inspection-reports/actions.ts`
- 관련 Supabase table/bucket: `inspection_reports.product_type_code_seq`, `inspection_report_measurements`
- 재사용할 기존 패턴: `saveInspectionMeasurements` 인증·입력 검증·revalidate 처리
- 문서와 구현의 차이: 현재 체크박스는 disabled 읽기 전용이며 저장 Action은 측정값만 갱신한다.

## 설계

### UI와 반응형

- 모바일: 기존 성적서 가로 스크롤 구조 유지
- 태블릿: 기존 구조 유지
- 데스크톱: 제품구분 체크박스를 직접 선택 가능
- 로딩/빈 상태/오류/권한: 코드가 없으면 선택 항목 없이 표시, 저장 오류는 기존 하단 상태 영역 사용
- 접근성: 각 체크박스를 코드명 label과 연결하고 단일 선택임을 제품구분 그룹으로 제공

### Server/Client 경계

- Server Component/Action: `saveInspectionMeasurements`가 제품구분을 검증하고 마스터를 갱신
- Client Component/Zustand: 성적서별 선택값은 컴포넌트 지역 상태로 관리, Zustand 추가 없음

### 데이터와 Supabase

- schema 변경: 없음
- PK/FK/index: 변경 없음
- RLS 정책: 기존 `inspection_reports` update 정책 사용
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration 없음, UI 상태와 Action update 제거로 rollback 가능

## 변경 계획

1. 성적서별 제품구분 지역 상태를 마스터 값으로 초기화한다.
2. 체크박스를 활성화하고 단일 선택·선택 해제 동작을 연결한다.
3. 선택값을 hidden form field로 전송한다.
4. Server Action에서 제품구분을 파싱하고 측정값 저장 후 마스터를 갱신한다.
5. 관련 경로를 revalidate하고 정적 검사와 build를 수행한다.

## 위험과 승인 사항

- 체크박스 표현이지만 DB는 단일 FK이므로 동시에 한 항목만 저장한다.
- 측정값 저장 후 마스터 갱신이 실패하는 부분 성공 가능성을 줄이기 위해 오류 메시지를 구분한다. 현재 구조에는 DB transaction RPC가 없으므로 완전한 원자성은 제공하지 않는다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — 기존 RLS 사용
- [x] 프로덕션 빌드

## 결과

- 변경: 마스터 제품구분 초기값, 성적서별 지역 수정 상태, 단일 선택 체크박스와 측정 저장 Action의 제품구분 검증·갱신을 구현했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과
- 미실행: 인증된 실제 데이터 기반 브라우저 저장 및 인쇄 미리보기 수동 확인
- 남은 위험/후속 작업: 측정값 저장 후 제품구분 갱신이 실패하면 측정값만 먼저 저장될 수 있다. 완전한 원자성이 필요하면 별도 DB 함수 설계가 필요하다. 다중 선택이 필요하면 연결 테이블 설계가 필요하다.
