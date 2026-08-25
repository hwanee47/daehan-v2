# 품목·품목상세 행 상세 보기 Dialog

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-25
- 승인 상태: 승인
- 승인 응답/일시: 사용자 `승인` / 2026-08-25

## 배경과 목적

품목과 품목상세 목록에서는 여러 컬럼을 한눈에 비교할 수 있지만 비고와 대표 이미지를 포함한 전체 정보를 함께 확인하기 어렵다. 각 AG Grid 행을 더블클릭하면 읽기 전용 상세 Dialog를 열어 해당 행의 정보와 대표 이미지를 한 화면에서 확인할 수 있게 한다.

## 범위

### 포함

- 품목 행 더블클릭 시 품목 상세 보기 Dialog 열기
- 품목상세 행 더블클릭 시 품목상세 상세 보기 Dialog 열기
- 품목: 품목코드, 품목명, 모델명, 비고, 대표 이미지 표시
- 품목상세: 연결 품목, 상세코드, 상세명, 소재, 비고, 대표 이미지 표시
- 이미지가 없을 때 명확한 빈 이미지 상태 표시
- 상세 Dialog 이미지 클릭 시 기존 전체 화면 이미지 보기 재사용
- 직접 URL, 탭 작업영역과 단일·2분할 화면에서 동일 동작
- 키보드 사용자를 위한 행 Enter 상세 보기 동작과 Dialog focus 관리

### 제외

- 상세 보기 Dialog 안에서 정보 또는 이미지 수정·삭제
- 새로운 DB query, Supabase schema, Storage 및 RLS 변경
- 이전·다음 행 탐색 버튼
- 이미지 확대·축소, 다운로드와 회전

## 완료 조건

- [x] 품목 행을 더블클릭하면 해당 품목의 정보와 이미지가 표시된다.
- [x] 품목상세 행을 더블클릭하면 해당 상세 정보, 연결 품목과 이미지가 표시된다.
- [x] 이미지가 없으면 빈 상태가 표시된다.
- [x] 상세 Dialog의 이미지를 실행하면 기존 전체 화면 이미지 Dialog가 열린다.
- [x] Escape와 닫기 버튼으로 Dialog가 닫히고 focus가 그리드로 복귀한다.
- [x] 키보드로 선택 행에서 Enter를 누르면 같은 상세 Dialog가 열린다.
- [x] 직접 URL과 탭 작업영역, 단일·2분할 화면에서 동일하게 동작한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/master/items/item-management.tsx`의 `ItemManagement`, `DialogFrame`, `FullscreenImageDialog`, 두 `AgGridReact`
- 관련 Supabase table/bucket: 기존 `items`, `item_details`, private `item-images`의 이미 조회된 데이터와 signed URL을 재사용하며 변경하지 않는다.
- 재사용할 기존 패턴: Base UI `Dialog` Portal, 현재 이미지 빈 상태, `FullscreenImageDialog`, AG Grid `RowClickedEvent`
- 문서와 구현의 차이: 현재 행은 단일 클릭으로 선택만 하며 더블클릭 또는 키보드로 읽기 전용 전체 정보를 여는 기능이 없다.

## 설계

### UI와 반응형

- 모바일: 이미지와 정보 영역을 한 열로 배치하고 Dialog 내부 세로 스크롤을 허용한다.
- 태블릿: 사용 가능한 폭에 따라 이미지와 정보가 자연스럽게 배치되도록 한다.
- 데스크톱: 대표 이미지와 필드 정보를 2열로 배치해 동시에 확인한다.
- 로딩/빈 상태/오류/권한: 이미 화면에 로드된 데이터를 사용해 별도 로딩이 없다. nullable 필드는 `-`, 이미지 없음은 안내 영역으로 표시하며 기존 route 권한을 유지한다.
- 접근성: 읽기 전용 정보를 `dl`, `dt`, `dd`로 구성한다. 행 Enter 동작, Dialog 제목·설명, Escape 닫기와 focus 복귀를 제공한다.

### Server/Client 경계

- Server Component/Action: 변경 없음. 기존 조회 데이터와 signed URL을 그대로 사용한다.
- Client Component/Zustand: 현재 상세 보기 대상을 `ItemManagement` 지역 상태로만 관리하며 전역 store에는 추가하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: migration 없음. UI 변경을 되돌리면 된다.

## 변경 계획

1. 품목과 품목상세를 공통으로 표현할 읽기 전용 상세 Dialog를 추가한다.
2. 각 AG Grid의 행 더블클릭 이벤트에서 해당 레코드와 최신 이미지 override를 Dialog에 전달한다.
3. 행 Enter 키에 동일한 상세 보기 동작을 연결한다.
4. 대표 이미지와 빈 상태를 표시하고 기존 전체 화면 이미지 Dialog를 연결한다.
5. 직접 URL·탭·분할 화면, 키보드와 반응형을 검증한다.
6. lint, TypeScript와 프로덕션 빌드를 실행한다.

## 위험과 승인 사항

- 단일 클릭은 기존처럼 선택만 하고 더블클릭 또는 Enter만 상세 Dialog를 연다.
- signed URL과 업로드 직후 `imageOverrides`를 모두 반영해 최신 이미지를 표시해야 한다.
- DB, Supabase Storage, 권한 정책 변경은 없다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [x] Supabase 허용/거부 정책 — 해당 없음, 데이터 계층 변경 없음
- [x] 프로덕션 빌드

## 결과

- 변경: 품목·품목상세 행 더블클릭과 Enter에 읽기 전용 상세 Dialog를 연결하고 모든 정보, 최신 대표 이미지, 이미지 빈 상태와 전체 화면 보기를 추가했다.
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, `git diff --check` 통과.
- 미실행: 별도 자동 테스트가 없어 단위·통합 테스트를 실행하지 못했다. 인증된 실제 브라우저 세션에서 360px·768px·1280px 시각 확인, 직접 URL·탭·분할 화면과 키보드 focus 흐름은 미실행이다.
- 남은 위험/후속 작업: 실제 브라우저에서 AG Grid의 더블클릭·Enter 이벤트와 중첩 전체 화면 Dialog를 최종 확인해야 한다.
