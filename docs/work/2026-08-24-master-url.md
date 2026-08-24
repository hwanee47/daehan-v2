# 기준정보 URL을 master로 변경

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-24
- 승인 상태: 승인
- 승인 응답/일시: 사용자가 "승인"으로 명시적으로 승인함 / 2026-08-24

## 배경과 목적

기준정보 코드관리 화면의 현재 URL `/reference-information/codes`를 더 짧은 `/master/codes`로 변경한다. 메뉴, Server Action 캐시 갱신과 문서가 새 URL을 일관되게 사용하도록 맞춘다.

## 범위

### 포함

- 코드관리 공개 URL을 `/master/codes`로 변경
- App Router route 폴더를 `reference-information/codes`에서 `master/codes`로 이동
- header 기준정보 메뉴의 코드관리 링크를 새 URL로 변경
- 코드관리 Server Action의 `revalidatePath` 대상을 새 URL로 변경
- 기존 `/reference-information/codes` 요청을 `/master/codes`로 영구 redirect하여 기존 북마크 호환
- 아키텍처 문서의 일반 화면 route 설명 갱신

### 제외

- 화면에 표시되는 `기준정보`, `코드관리` 명칭 변경
- `ReferenceInformationMenu` 컴포넌트 이름과 파일명 변경
- 코드관리 기능, 권한, DB schema, RLS 변경
- `/master` 자체 목록 페이지 추가

## 완료 조건

- [x] 기준정보 메뉴에서 코드관리를 선택하면 `/master/codes`로 이동한다.
- [x] `/master/codes`에서 기존 코드관리 화면과 관리자 권한 검사가 동작한다.
- [x] 코드 변경 후 `/master/codes`가 revalidate된다.
- [x] `/reference-information/codes`는 `/master/codes`로 영구 redirect된다.
- [x] 소스와 아키텍처 문서의 활성 route 참조가 `/master/codes`로 정리된다.
- [x] lint, typecheck와 프로덕션 build가 통과한다.

## 현재 구현 조사

- 관련 route/component: `src/app/(app)/reference-information/codes/*`, `src/app/reference-information-menu.tsx`, `docs/architecture.md`
- 관련 Supabase table/bucket: `code_groups`, `code_details`를 그대로 사용하며 변경 없음
- 재사용할 기존 패턴: App Router route segment, `next/navigation`의 server redirect, 기존 관리자 권한 검사
- 문서와 구현의 차이: 현재 문서와 구현 모두 `/reference-information/*`를 사용하며 사용자 요청에 따라 `/master/*`로 변경해야 한다.

## 설계

### UI와 반응형

- 모바일: 시각적 변경 없음
- 태블릿: 시각적 변경 없음
- 데스크톱: 시각적 변경 없음
- 로딩/빈 상태/오류/권한: 기존 코드관리 상태와 관리자 redirect를 유지한다.
- 접근성: 메뉴 label, role과 키보드 동작을 유지한다.

### Server/Client 경계

- Server Component/Action: 코드관리 page와 action은 새 route segment에서 기존 Server Component/Action 경계를 유지한다. 이전 URL redirect도 서버에서 처리한다.
- Client Component/Zustand: header dropdown의 href만 변경하며 상태 구조는 유지한다.

### 데이터와 Supabase

- schema 변경: 해당 없음
- PK/FK/index: 해당 없음
- RLS 정책: 해당 없음
- Storage bucket/path/policy: 해당 없음
- migration과 rollback: 해당 없음. route와 링크를 기존 URL로 되돌리면 된다.

## 변경 계획

1. 코드관리 route 폴더를 `(app)/master/codes`로 이동한다.
2. 메뉴 href와 Server Action의 `revalidatePath`를 `/master/codes`로 변경한다.
3. 이전 route에 영구 redirect page를 추가한다.
4. `docs/architecture.md`의 route 설명을 갱신한다.
5. route type을 재생성하고 lint, typecheck, build를 검증한다.

## 위험과 승인 사항

- 공개 URL이 변경되지만 기존 주소는 영구 redirect하므로 북마크와 외부 링크를 보존한다.
- redirect 응답은 브라우저와 검색 엔진에 캐시될 수 있다.
- 화면명은 사용자가 보는 한국어 의미를 유지하기 위해 `기준정보`로 남긴다.
- 위 URL 변경과 영구 redirect는 사용자 승인 후 구현한다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 별도 테스트 유무 확인
- [x] 모바일 360px — 시각 클래스 변경 없음 확인
- [x] 태블릿 768px — 시각 클래스 변경 없음 확인
- [x] 데스크톱 1280px — 시각 클래스 변경 없음 확인
- [x] 키보드와 접근성 — 메뉴 속성과 동작 코드 보존 확인
- [x] Supabase 허용/거부 정책 — 변경 없음 확인
- [x] 프로덕션 빌드

## 결과

- 변경: 코드관리 route를 `/master/codes`로 이동하고 메뉴 href와 Server Action revalidation 경로를 갱신했다. 이전 `/reference-information/codes`에는 `permanentRedirect` 호환 route를 추가하고 아키텍처 문서를 갱신했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack` 통과. 로컬 HTTP 검증에서 이전 URL의 308 응답과 `Location: /master/codes`를 확인했다. 새 URL은 비로그인 상태에서 기존 정책대로 `/login`으로 이동했다.
- 미실행: 로그인된 관리자 세션의 브라우저 클릭 테스트는 수행하지 않았다. UI와 권한 코드는 변경하지 않고 route만 이동했다.
- 남은 위험/후속 작업: 영구 redirect는 브라우저에 캐시될 수 있다.
