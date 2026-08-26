# 검사성적서 마스터 필드 단순화

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 2026-08-26 사용자 응답 “승인”

## 배경과 목적

검사성적서 마스터에서 불필요한 납품일자·검사자·검사일자·특기사항·상태를 제거하고, 성적서 초안은 품목상세만 선택해 저장할 수 있게 단순화한다.

## 범위

### 포함

- 마스터 컬럼 `delivery_date`, `inspector_name`, `inspection_date`, `special_notes`, `status` 삭제
- 관련 날짜·상태 index와 상태 흐름 제거
- 고객명·업체명·납품수량·시료수 nullable 변경
- 관리 화면에서 삭제 필드와 날짜 기본값 제거
- 품목상세만 필수, 검사항목 없이 저장 허용
- 측정 화면에서 삭제 필드 영역과 완료 잠금 제거

### 제외

- 삭제 컬럼 데이터 백업
- DB 외부 복구 도구
- 품목상세·기종·품목상세코드 자동 스냅샷 변경

## 완료 조건

- [x] 품목상세만 선택한 성적서를 저장할 수 있다.
- [x] 삭제 대상 필드가 DB와 화면에 남지 않는다.
- [x] 측정결과는 상태 잠금 없이 저장·재수정할 수 있다.
- [x] 시료수가 없으면 측정값 입력이 잠긴다.

## 현재 구현 조사

- 관련 route/component: `inspection-reports/*`, `inspection-measurements/*`
- 관련 Supabase table/bucket: `inspection_reports`; bucket 해당 없음
- 재사용할 기존 패턴: migration, Server Action, 공통 loader·타입
- 문서와 구현의 차이: 현재 삭제 대상 컬럼과 날짜·상태 index, 완료 잠금 흐름이 모두 사용 중이다.

## 설계

### UI와 반응형

- 모든 viewport: 삭제 필드, 검색조건과 목록 열 제거
- 로딩/빈 상태/오류/권한: 시료수 미입력 시 측정 입력 잠금 안내
- 접근성: 품목상세만 `required`; 나머지 필드는 선택 사항으로 표시

### Server/Client 경계

- Server Component/Action: nullable parsing과 빈 검사항목 저장, 상태 없는 측정결과 저장
- Client Component/Zustand: 기존 지역 상태 유지, Zustand 변경 없음

### 데이터와 Supabase

- schema 변경: 5개 컬럼 삭제, 4개 컬럼 nullable
- PK/FK/index: PK/FK 유지, 날짜·상태 index 삭제
- RLS 정책: 변경 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 구조는 재생성할 수 있으나 삭제 컬럼의 기존 값은 복구할 수 없음

## 변경 계획

1. 파괴적 migration과 앱 타입·query를 수정한다.
2. 관리·측정 Server Action을 새 필드 규칙에 맞춘다.
3. 관리·측정 화면에서 삭제 필드와 상태 흐름을 제거한다.
4. 원격 dry run 후 적용하고 최신 상태와 schema lint를 확인한다.
5. lint, TypeScript와 build를 확인한다.

## 위험과 승인 사항

- 삭제 대상 컬럼의 기존 값은 영구 삭제되며 자동 rollback할 수 없다.
- 상태 삭제로 완료·취소 이력과 완료 후 읽기 전용 보호가 사라진다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책 — RLS 변경 없음
- [x] 프로덕션 빌드
- [x] 원격 migration dry run·적용·후속 dry run·schema lint

## 결과

- 변경: 마스터의 납품일자·검사자·검사일자·특기사항·상태와 관련 index를 제거하고 고객명·업체명·납품수량·시료수를 nullable로 변경함. 관리·측정 화면과 Action에서 삭제 필드, 상태 잠금과 완료 흐름을 제거함
- 검증: ESLint, TypeScript, 프로덕션 빌드와 `git diff --check` 통과. 원격 dry run에서 migration 1건만 확인해 적용했고 후속 dry run 최신 상태, local/remote migration 일치와 schema lint 오류 없음을 확인함
- 미실행: 로그인 세션 부재로 브라우저에서 품목상세만 선택한 실제 저장은 수행하지 못함
- 남은 위험/후속 작업: 삭제된 기존 컬럼 값은 복구할 수 없으며, 시료수가 없는 성적서는 관리 화면에서 시료수를 입력하기 전까지 측정값을 입력할 수 없음
