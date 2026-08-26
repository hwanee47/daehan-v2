# 검사성적서 관리 화면 DB 연결

## 상태

- 단계: 검증
- 담당: Codex
- 작성일: 2026-08-26
- 승인 상태: 승인
- 승인 응답/일시: 2026-08-26 사용자 응답 “승인”

## 배경과 목적

검사성적서 화면은 현재 정적 예시 데이터만 표시한다. 첨부된 종이 검사성적서의 정보 구조를 참고해 기존 Supabase의 마스터·검사항목·측정결과를 실제 조회·등록·수정·삭제하는 디지털 관리 화면을 제공한다.

## 범위

### 포함

- 정적 예시 데이터 제거 및 실제 `inspection_reports` 목록 조회
- 기종·품목상세코드·고객명·납품일자·검사일자·판정·상태 조회조건
- 검사성적서 신규 등록·수정·삭제
- 품목상세 선택과 현재 품목·품목상세 정보로 기종·품명·품번·재질 표시
- 현재 품목상세 대표 이미지를 도면/제품 이미지 영역에 표시하고 전체 화면 보기 제공
- 납품수량·시료수·납품일자·제품구분·경도·열처리·특기사항·검사자·검사일자·최종판정·상태 입력
- 검사항목 행 추가·삭제·정렬, 기준치수와 공차 min/max 입력
- 각 검사항목의 결과 1~10과 비고 입력
- 시료수를 초과하는 결과 칸 비활성화
- 작성 중 저장, 완료, 취소 상태 표시
- 직접 URL과 탭 작업영역에서 같은 데이터와 기능 제공
- 기존 Server Action·RLS를 통한 권한 및 서버 입력 검증

### 제외

- DB 컬럼, trigger, 함수, RLS와 migration 변경
- 제품구분 및 최종판정 상세 코드 seed
- 품명·재질·이미지의 발행 당시 스냅샷 보존
- 작성·검토·승인 결재란
- PDF·인쇄 전용 양식과 성적서 번호 생성
- 여러 차수의 재검사 결과
- 결과값 자동 합격·불합격 판정

## 완료 조건

- [ ] 실제 검사성적서 목록을 조회하고 검색할 수 있다.
- [ ] 마스터, 검사항목과 측정결과를 등록·수정·삭제할 수 있다.
- [ ] 품목상세 선택 시 현재 기종·품명·품번·재질·대표 이미지가 표시된다.
- [ ] 제품구분과 최종판정은 사용자가 등록한 해당 코드 그룹의 활성 코드만 사용한다.
- [ ] 코드가 없을 때 저장 불가 이유와 코드관리 안내를 표시한다.
- [ ] 시료수에 맞춰 결과 입력 1~10을 활성화한다.
- [ ] 로딩·빈 상태·오류·저장 중 상태를 제공한다.
- [ ] 직접 URL과 탭 작업영역, 단일·2분할 화면에서 동일하게 동작한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/inspection-reports/page.tsx`, `inspection-reports-grid.tsx`, `(app)/layout.tsx`, `workspace-panels.tsx`
- 관련 Supabase table/bucket: `inspection_reports`, `inspection_report_items`, `inspection_report_measurements`, `items`, `item_details`, `code_groups`, `code_details`, private `item-images`
- 재사용할 기존 패턴: Server Component query, Server Action 관리자/사용자 검증, AG Grid, Base UI Dialog, signed URL helper, workspace panel 공유
- 문서와 구현의 차이: 현재 검사성적서 화면은 정적 배열이며 workspace panel도 데이터 props 없이 같은 정적 Grid만 렌더링한다.

## 설계

### UI와 반응형

- 모바일: 목록과 편집 기본정보는 한 열, 측정표는 독립 가로 스크롤을 사용한다.
- 태블릿: 기본정보를 2열로 배치하고 이미지와 중요정보를 분리한다.
- 데스크톱: 첨부 양식처럼 상단 기본정보, 중앙 이미지·중요정보, 하단 검사항목·측정결과 표와 최종판정 순서로 배치한다.
- 로딩/빈 상태/오류/권한: 목록·선택 코드·이미지 오류와 저장 pending을 제공한다. `PRODUCT_TYPE` 코드가 없으면 저장을 막고 코드관리 등록 안내를 표시한다.
- 접근성: 모든 입력 label, 표 제목, 키보드 행 추가·삭제, Dialog focus와 오류 live region을 제공한다.

### Server/Client 경계

- Server Component/Action: page와 workspace layout에서 마스터·품목·코드 데이터를 조회하고, Server Action에서 입력 검증 후 세 테이블을 저장·삭제한다.
- Client Component/Zustand: 목록 선택, 검색, 편집 중인 검사항목·측정값은 마운트된 패널의 React 지역 상태로 유지한다. 전역 store에는 복제하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음. 현재 원격 스키마만 사용한다.
- PK/FK/index: 변경 없음
- RLS 정책: 변경 없음. 기존 authenticated 조회·등록, 작성자 또는 admin 수정·삭제 정책을 따른다.
- Storage bucket/path/policy: 변경 없음. 현재 품목상세 `image_path`의 signed URL만 표시한다.
- migration과 rollback: migration 없음. 애플리케이션 파일만 되돌리면 된다.

## 변경 계획

1. 검사성적서 타입과 서버 데이터 loader를 추가한다.
2. 직접 URL과 workspace layout에서 동일한 실제 데이터를 준비한다.
3. 검색·목록·빈 상태를 실제 데이터에 연결한다.
4. 첨부 양식 구조를 Daehan 디자인 시스템에 맞춘 편집 UI로 구현한다.
5. 마스터·검사항목·측정결과 Server Action과 서버 검증을 구현한다.
6. 등록·수정·삭제 후 직접 URL과 workspace 데이터를 revalidate한다.
7. 모바일·태블릿·데스크톱 및 단일·분할 화면을 확인한다.
8. lint, TypeScript, 프로덕션 빌드와 브라우저 디자인 QA를 수행한다.

## 위험과 승인 사항

- DB 보완을 하지 않으므로 품명·재질·대표 이미지는 현재 품목마스터 값을 표시하며 발행 당시 값으로 보존되지 않는다.
- 코드 seed를 하지 않으므로 사용자가 `PRODUCT_TYPE`과 `FINAL_JUDGMENT_STATUS` 그룹에 상세 코드를 등록해야 한다. 제품구분 활성 코드가 없으면 신규 저장이 불가능하다.
- DB RPC를 추가하지 않으므로 마스터·검사항목·측정결과의 다중 테이블 저장은 단일 DB transaction으로 묶을 수 없다. 등록 실패 시 새 마스터를 보상 삭제하고, 수정 중 일부 단계 실패는 사용자에게 재시도 안내와 서버 로그를 남긴다.
- 첨부 이미지는 정보 구조와 조밀한 측정표의 기준으로 사용한다. 화면 chrome은 기존 Daehan 디자인 시스템을 유지하며 인쇄 양식의 검은 테두리 스타일을 그대로 복제하지 않는다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트
- [ ] 모바일 360px
- [ ] 태블릿 768px
- [ ] 데스크톱 1280px
- [ ] 키보드와 접근성
- [ ] Supabase 허용/거부 정책 — 기존 정책 기반 앱 동작 확인
- [x] 프로덕션 빌드
- [ ] 첨부 참고 이미지와 구현 화면 디자인 QA

## 결과

- 변경: 실제 데이터 loader, 직접 URL·workspace 공통 관리 화면, 검색, 등록·수정·삭제 Server Action, 품목 이미지 확대, X1~X10 측정표를 구현함
- 검증: `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`, 로컬 서버와 로그인 redirect/console error 확인
- 미실행: 로그인 세션 부재로 대상 화면 캡처, 등록·수정·삭제 실데이터 동작, 모바일·분할 화면 디자인 QA를 수행하지 못함
- 남은 위험/후속 작업: 인앱 브라우저 로그인 후 `design-qa.md`의 차단 항목을 재검증해야 함
