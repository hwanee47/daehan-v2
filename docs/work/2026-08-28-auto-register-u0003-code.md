# 검사성적서 직접입력 기준치수 U0003 자동 등록

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-28
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-28

## 배경과 목적

검사성적서의 기준치수 자동완성에 없는 값을 직접 입력해 저장할 때 같은 값을 이후에도 선택할 수 있도록 `U0003` 상세 코드에 자동 등록한다. 기존 코드를 선택하거나 기존 성적서를 수정 저장하는 경우에는 불필요한 코드를 만들지 않는다.

## 범위

### 포함

- 기준치수 행의 직접 입력 여부를 지역 상태와 제출 데이터에 포함
- U0003 목록 선택은 직접 입력에서 제외
- 검사성적서 저장 전 직접 입력 코드명을 제한형 DB 함수에 일괄 전달
- 없는 코드명만 U0003에 활성 상세 코드로 생성
- 상세 코드는 숫자형 기존 코드의 max + 1, 10 미만 두 자리 적용
- 동시 실행 잠금, 코드명 중복 방지, 인증 사용자만 실행
- 코드관리·검사성적서 경로 재검증

### 제외

- 일반 사용자에게 `code_details` 직접 insert/update/delete 권한 부여
- 다른 코드그룹 자동 등록
- 기준치수 코드명을 검사성적서 항목에 별도 스냅샷 컬럼으로 저장

## 완료 조건

- [x] 자동완성에 없는 기준치수만 U0003 보장 함수에 전달된다.
- [x] 기존 U0003 값을 선택하면 등록 대상으로 전달하지 않는다.
- [x] 기존 성적서를 값 변경 없이 수정 저장해도 등록 대상으로 전달하지 않는다.
- [x] 함수 내 transaction advisory lock과 기존 unique 제약으로 동시 중복을 방지한다.
- [x] 기존 RLS를 변경하지 않고 authenticated에는 제한형 함수 실행 권한만 부여한다.

## 현재 구현 조사

- 관련 route/component: `inspection-report-management.tsx`, `tolerance-autocomplete.tsx`, `inspection-reports/actions.ts`
- 관련 Supabase table/bucket: `code_groups`, `code_details`
- 재사용할 기존 패턴: security definer RPC, U0003 조회, 코드명 unique index, 감사 trigger
- 문서와 구현의 차이: 검사성적서 항목에는 기준치수 원문이 저장되지 않아 수정 화면에서는 직접 입력 여부를 별도 UI 상태로 관리해야 한다.

## 설계

### UI와 반응형

- 모바일/태블릿/데스크톱: 기존 UI 유지
- 로딩/빈 상태/오류/권한: 자동 등록 실패 시 성적서 저장을 중단하고 안내
- 접근성: 기존 Autocomplete 키보드 동작 유지

### Server/Client 경계

- Server Component/Action: 직접 입력으로 제출된 값만 RPC 호출 후 성적서 저장
- Client Component/Zustand: 행별 직접 입력 여부를 기존 draft 지역 상태에 포함. Zustand 변경 없음

### 데이터와 Supabase

- schema 변경: 제한형 `public.ensure_u0003_codes(text[])` 함수 추가
- PK/FK/index: 기존 code/code_name unique 제약 재사용
- RLS 정책: 변경 없음. 테이블 insert 정책은 관리자 전용 유지
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 함수 생성 및 authenticated execute 부여. rollback은 execute 회수 후 함수 삭제

## 변경 계획

1. U0003 전용 일괄 보장 함수를 migration으로 추가한다.
2. 기준치수 입력/선택 상태를 draft에 반영한다.
3. 성적서 저장 Action에서 직접 입력값만 RPC로 전달한다.
4. lint, typecheck, build, Supabase dry run·적용·최신 상태를 검증한다.

## 위험과 승인 사항

- RPC 성공 후 후속 성적서 저장이 실패하면 생성된 U0003 코드는 남을 수 있다. 코드는 이후 재사용 가능한 기준정보이므로 자동 삭제하지 않는다.
- 한 번에 최대 50개, 코드명 100자 이하로 제한한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px (UI 구조 변경 없음)
- [ ] 태블릿 768px (UI 구조 변경 없음)
- [ ] 데스크톱 1280px (UI 구조 변경 없음)
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책
- [x] 프로덕션 빌드

## 결과

- 변경: 직접 입력 여부를 draft에 포함하고 U0003 전용 보장 RPC 및 저장 Action 연동을 추가했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, 원격 `supabase db push --dry-run` 통과.
- 미실행: 실제 인증 사용자 UI 저장 테스트.
- 남은 위험/후속 작업: 원격 migration 적용과 후속 dry run 최신 상태 확인을 완료했다.
