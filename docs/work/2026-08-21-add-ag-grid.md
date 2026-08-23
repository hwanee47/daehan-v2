# 검사성적서 AG Grid 추가

## 상태

- 단계: 완료
- 담당: Codex
- 작성일: 2026-08-21
- 승인 상태: 승인
- 승인 응답/일시: 사용자 "승인" / 2026-08-21

## 배경과 목적

검사성적서 화면에 표 형식 데이터를 표시할 기반으로 AG Grid Community를 도입한다. Next.js의 Server Component 기본 구조는 유지하고, 브라우저 상호작용이 필요한 그리드만 작은 Client Component로 분리한다.

## 범위

### 포함

- `ag-grid-community`, `ag-grid-react` Community 패키지 설치
- `src/app/inspection-reports` 가까이에 검사성적서 전용 Client Component 추가
- 검사성적서 페이지에 정렬 가능한 기본 예시 열과 행 표시
- 프로젝트 디자인 토큰에 맞춘 테두리, 글꼴, 배경과 반응형 가로 스크롤 처리

### 제외

- AG Grid Enterprise 및 라이선스 기능
- Supabase 데이터 조회·변경과 DB schema/migration
- 행 추가·수정·삭제, 서버 페이지네이션, 파일 내보내기
- 전역 공통 DataGrid API 설계

## 완료 조건

- [x] 검사성적서 페이지에서 AG Grid Community 표가 정상 렌더링된다.
- [x] 열 정렬과 키보드 탐색이 동작한다.
- [x] 360px, 768px, 1280px 너비에서 콘텐츠가 잘리지 않고 필요한 경우 표 영역이 가로 스크롤된다.
- [x] ESLint와 TypeScript 검사를 통과한다.

## 현재 구현 조사

- 관련 route/component: `src/app/inspection-reports/page.tsx`; 현재 준비 안내 문구만 존재한다.
- 관련 Supabase table/bucket: 해당 없음. 이번 작업은 예시 로컬 데이터만 사용한다.
- 재사용할 기존 패턴: Server page에서 기능 전용 Client Component를 import하는 구조, `Container`, semantic color token과 큰 radius를 재사용한다.
- 문서와 구현의 차이: 해당 없음.

## 설계

### UI와 반응형

- 모바일: 표 컨테이너는 화면 폭을 유지하고 최소 열 너비를 넘는 내용은 내부 가로 스크롤로 탐색한다.
- 태블릿: 가용 폭에 맞춰 열을 표시한다.
- 데스크톱: `Container size="lg"` 안에서 전체 열을 표시한다.
- 로딩/빈 상태/오류/권한: 로컬 예시 데이터만 사용하므로 로딩·오류·권한 상태는 해당 없음. 빈 배열에는 AG Grid 기본 빈 상태를 표시한다.
- 접근성: 페이지 제목 구조를 유지하고 AG Grid의 기본 키보드 탐색과 ARIA grid semantics를 보존한다.

### Server/Client 경계

- Server Component/Action: `page.tsx`는 metadata와 페이지 레이아웃을 담당하는 Server Component로 유지한다.
- Client Component/Zustand: AG Grid 렌더링과 열 정의만 기능 전용 Client Component에 둔다. Zustand는 사용하지 않는다.

### 데이터와 Supabase

- schema 변경: 해당 없음.
- PK/FK/index: 해당 없음.
- RLS 정책: 해당 없음.
- Storage bucket/path/policy: 해당 없음.
- migration과 rollback: 해당 없음. 롤백은 추가 패키지와 그리드 컴포넌트를 제거하고 기존 준비 문구로 복원한다.

## 변경 계획

1. 승인 후 Community 패키지의 현재 호환 버전을 npm으로 설치한다.
2. 설치 버전의 공식 API와 Next.js Client Component 요구사항을 확인한다.
3. 검사성적서 전용 AG Grid Client Component와 예시 데이터를 추가한다.
4. 검사성적서 Server page에 그리드를 배치하고 디자인 토큰·반응형 스타일을 적용한다.
5. lint, typecheck와 필요한 경우 production build를 실행하고 화면 크기 및 키보드 동작을 확인한다.

## 위험과 승인 사항

- 새로운 최상위 라이브러리 2개를 도입하므로 명시적 승인이 필요하다.
- AG Grid는 브라우저 기반 컴포넌트이므로 해당 부분의 클라이언트 번들 크기가 증가한다.
- 이번 범위는 Community 버전만 사용하며 Enterprise 패키지나 라이선스는 추가하지 않는다.

## 검증 계획

- [x] ESLint
- [x] TypeScript
- [ ] 관련 단위/통합 테스트 — 프로젝트에 관련 테스트 환경이 없어 미실행
- [x] 모바일 360px
- [x] 태블릿 768px
- [x] 데스크톱 1280px
- [x] 키보드와 접근성
- [x] Supabase 허용/거부 정책 — 해당 없음(DB 미사용)
- [x] 프로덕션 빌드

## 결과

- 변경: AG Grid Community 36.1.0 패키지를 설치하고 검사성적서 전용 Client Component, 예시 행과 정렬 가능한 열, Daehan 테마와 반응형 가로 스크롤을 추가했다.
- 검증: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npx next build --webpack`을 통과했다. 브라우저에서 360px, 768px, 1280px 렌더링과 열 정렬(`aria-sort="ascending"`), 콘솔 오류 없음도 확인했다.
- 미실행: 관련 단위/통합 테스트는 현재 프로젝트에 테스트 환경이 없어 미실행했다.
- 남은 위험/후속 작업: 현재 행은 UI 확인용 로컬 예시 데이터다. 실제 데이터 연결과 편집 기능은 별도 승인 작업으로 다룬다.
