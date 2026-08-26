# 검사항목 순번 위치 설정

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-26

## 배경과 목적

품목상세 이미지를 기준으로 검사 위치와 검사항목 순번의 관계를 쉽게 확인하도록, 사용자가 이미지 위에 검사항목 번호를 배치하고 성적서와 함께 저장한다.

## 범위

### 포함

- 성적서 등록·수정 Dialog의 순번 위치 설정 UX
- 검사항목별 정규화 좌표 저장
- 성적서 상세, 전체화면 이미지, 측정결과 입력 화면의 순번 표시
- 기존 품목상세 이미지 재사용

### 제외

- 품목상세 공통 검사항목 템플릿
- 이미지 신규 업로드 또는 Storage 정책 변경
- 검사항목 자체의 드래그 정렬

## 완료 조건

- [x] 이미지 클릭으로 선택된 검사항목 번호를 배치하고 다음 미설정 항목으로 이동한다.
- [x] 특정 항목 선택, 위치 재설정, 마지막 작업 취소, 전체 초기화를 제공한다.
- [x] 좌표가 반응형 크기와 무관한 이미지 비율로 저장된다.
- [x] 관리·전체화면·측정 화면에 같은 위치로 표시된다.
- [x] 마커 변경이 기존 측정결과를 삭제하거나 재생성하지 않는다.

## 현재 구현 조사

- 관련 route/component: `inspection-report-management.tsx`, `inspection-measurement-sheet.tsx`, `actions.ts`, `data.ts`, `types.ts`
- 관련 Supabase table/bucket: `inspection_report_items`, 기존 품목상세 이미지 Storage signed URL
- 재사용할 기존 패턴: Base UI Dialog, 기존 FullscreenImage, 품목상세 `image_url`
- 문서와 구현의 차이: 해당 없음

## 설계

### UI와 반응형

- 모바일: 전체 화면에 가까운 Dialog, 이미지와 항목 목록을 세로 배치한다.
- 태블릿: 가용 폭에 따라 동일한 세로 배치를 유지한다.
- 데스크톱: 이미지와 항목 목록을 좌우 배치한다.
- 로딩/빈 상태/오류/권한: 이미지나 검사항목이 없으면 설정 버튼을 비활성화하고 이유를 안내한다.
- 접근성: Dialog focus 관리, 항목 선택 버튼, 마커의 접근성 이름, 44px 조작 영역을 제공한다.

### Server/Client 경계

- Server Component/Action: 좌표 검증 및 검사항목 insert/update를 수행한다.
- Client Component/Zustand: 좌표 편집은 ReportEditor 지역 상태로만 관리한다.

### 데이터와 Supabase

- schema 변경: `inspection_report_items.marker_x_ratio`, `marker_y_ratio` nullable numeric 컬럼 추가
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음. authenticated insert/update 컬럼 권한만 확장한다.
- Storage bucket/path/policy: 변경 없음
- migration과 rollback: 두 컬럼과 범위·동시-null 제약을 추가하며 rollback은 제약과 컬럼 제거다.

## 변경 계획

1. 좌표 컬럼 migration을 dry run 후 적용한다.
2. 타입, 조회와 저장 Action에 좌표를 연결한다.
3. 공통 이미지 마커 표시 컴포넌트와 위치 설정 Dialog를 구현한다.
4. 관리 상세·전체화면·측정 화면에 마커를 표시한다.
5. lint, typecheck, build와 가능한 UI 흐름을 검증한다.

## 위험과 승인 사항

- 좌표는 이미지 실제 표시 영역 기준 비율이어야 하며 `object-contain` 여백을 좌표에 포함하지 않는다.
- rollback 시 저장된 마커 위치만 삭제된다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책
- [x] 프로덕션 빌드

## 결과

- 변경: 검사항목 좌표 migration, 순번 위치 설정 Dialog, 관리·전체화면·측정 화면 마커 표시를 구현했다.
- 검증: ESLint, TypeScript, `next build --webpack`, migration 적용 후 dry run 최신 상태 확인을 통과했다.
- 미실행: 로그인 세션이 없어 실제 인증 후 UI 클릭 흐름은 실행하지 못했다. `db lint --linked`는 DB 비밀번호 인증 실패로 완료하지 못했다.
- 남은 위험/후속 작업: 로그인 후 실제 품목상세 이미지에서 모바일·태블릿·데스크톱 좌표 정합성과 저장 후 재조회 흐름을 확인해야 한다.
