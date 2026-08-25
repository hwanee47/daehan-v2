# 디자인 시스템

## 1. 디자인 방향

Daehan의 기본 디자인 언어는 Toss Design System에서 시각 원칙을 차용하되 토스의 브랜드, 금융 도메인과 제품 구조는 복제하지 않는다.

- 차가운 무채색에 가까운 흰 캔버스를 사용한다.
- 한 화면의 강조색은 primary blue 하나로 제한한다.
- 정보 밀도보다 가독성, 명확한 행동과 넉넉한 여백을 우선한다.
- 제품 카피는 일상적인 해요체로 쓰고 과장·명령·감탄 표현을 피한다.
- 카드, dialog, 버튼 등 주요 surface와 action의 모서리는 12~28px의 큰 radius와 full pill을 사용하되 blob/squircle 장식은 피한다. 입력 계열은 `rounded-sm`, AG Grid는 radius 없음을 기본으로 한다.
- 표면은 평면을 기본으로 하고 구분은 간격, 타이포그래피, divider, tint, border 순서로 해결한다.
- chrome에는 장식용 gradient, texture, 사진, 과한 shadow를 사용하지 않는다.

## 2. 원칙

1. 승인된 요구사항과 디자인
2. 기존 공통 컴포넌트
3. shadcn semantic token과 이 문서
4. 인접 화면 패턴

충돌이 있으면 추측하지 않고 차이를 확인한다.

## 3. 타이포그래피

- 전역 기본 글꼴은 `font-sans`에 연결된 Pretendard Variable이다.
- 별도 웹폰트를 화면 단위로 추가하지 않는다.
- 제목은 `font-semibold`, 본문은 `font-normal`을 기본으로 하되 정보 위계에 따라 조정한다.
- 한글·영문·숫자가 섞인 긴 콘텐츠의 줄바꿈과 overflow를 확인한다.
- 본문은 15px/1.5를 기본으로 한다.
- 실시간 수치와 표 데이터에는 `text-tabular`을 사용한다.
- 제품 문장은 `-요`로 끝나는 해요체를 기본으로 하며 버튼은 실행될 행동을 직접 표현한다.

## 4. 색상과 토큰

- `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `ring` 등 shadcn semantic token을 우선한다.
- 반복되는 색을 임의 hex 값으로 복제하지 않는다.
- 색상만으로 상태를 전달하지 않고 텍스트, 아이콘 또는 접근성 이름을 함께 제공한다.
- focus ring과 명도 대비를 유지한다.
- primary는 `oklch(0.624 0.176 254)`, foreground는 cool navy `oklch(0.234 0.03 254)`를 기준으로 한다.
- base palette를 화면 코드에서 직접 사용하지 않고 semantic token을 사용한다.

## 5. 컴포넌트

- shadcn primitive: `src/components/ui`
- 공통 레이아웃: `src/components/layout`
- 기능 전용 UI: 해당 라우트의 `components`
- 공통 승격은 최소 두 개의 독립 기능에서 같은 의미로 재사용될 때 검토한다.
- native element와 기존 shadcn 컴포넌트로 해결 가능한 경우 새 primitive를 만들지 않는다.
- shadcn 컴포넌트는 프로젝트 semantic token과 공통 radius를 상속해야 한다.
- `input`, `textarea`, `select` 등 입력 계열은 `rounded-sm`을 기본으로 한다.
- AG Grid의 theme wrapper와 외곽 overflow container에는 radius를 적용하지 않는다.
- primary 버튼은 화면당 하나를 원칙으로 하며 보조 행동은 secondary 또는 ghost로 표현한다.
- 모든 interactive surface는 최소 44×44px hit area를 확보한다.
- disabled는 컴포넌트 전체에 opacity 30%를 적용한다.
- motion은 120/200/320ms 범위에서 사용하고 bounce나 parallax를 피한다.

## 6. 반응형

모바일 우선으로 작성한다.

| 이름 | 시작 너비 | 기준 |
| --- | ---: | --- |
| `sm` | 640px | 큰 모바일/작은 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 노트북/데스크톱 |
| `xl` | 1280px | 큰 데스크톱 |
| `2xl` | 1536px | 와이드 화면 |

- 페이지 여백은 `Container`를 사용한다.
- CSS로 해결 가능한 배치는 Tailwind responsive modifier를 사용한다.
- `Responsive`는 단순 콘텐츠 노출 전환에 사용한다.
- `useBreakpoint`는 화면 크기에 따라 실제 동작이 달라져야 할 때만 사용한다.
- 모바일 360px, 태블릿 768px, 데스크톱 1280px을 기본 확인 지점으로 삼는다.

### Viewport와 작업영역 container

- 일반 페이지 chrome과 viewport 전체에 표시되는 UI는 `sm:`, `md:`, `lg:`, `xl:`, `2xl:` viewport modifier를 사용한다.
- 탭으로 열리는 업무 화면은 최상위에 `@container/workspace`를 두고 내부 레이아웃을 실제 패널 너비로 판단한다.
- workspace container도 위 표와 같은 수치를 사용한다: `@min-[640px]/workspace:`, `@min-[768px]/workspace:`, `@min-[1024px]/workspace:`, `@min-[1280px]/workspace:`, `@min-[1536px]/workspace:`.
- 같은 업무 화면을 직접 URL과 탭 패널에서 재사용할 때 양쪽 모두 `workspace` container를 제공해 전환 시점이 같아야 한다.
- 검색 폼, 카드 여백, 목록·상세 배치와 제목 크기처럼 패널 폭의 영향을 받는 표현은 container query를 사용한다.
- `Dialog`, `AlertDialog` 등 Portal로 viewport에 표시되는 UI는 workspace container query를 사용하지 않고 viewport modifier를 유지한다.

### 탭과 분할 작업영역

- 탭은 최대 5개까지 열고 닫기 전까지 패널을 마운트해 입력, 선택, 그리드와 스크롤 위치를 유지한다.
- 2분할은 `md` 이상에서 제공하며 기본 비율은 50:50, 조절 범위는 25:75부터 75:25까지다.
- 가운데 separator는 1px 경계선을 유지하되 충분한 pointer hit area를 제공한다. 방향키로 조절하고 Shift 조합으로 큰 단위 조절, Home 또는 더블클릭으로 50:50 복원을 지원한다.
- 앱 chrome은 `header`, `tabs`, 남은 높이의 `workspace` 순서로 구성한다. 헤더와 탭은 패널 스크롤에 포함하지 않는다.
- 단일 화면과 분할 화면 모두 각 업무 패널이 자체 세로 스크롤을 소유한다. 분할 패널끼리 scroll position을 공유하거나 wheel 스크롤이 반대 패널로 이어지지 않게 한다.
- 실제 검증은 단일·2분할, 25:75·50:50·75:25 비율에서 수행한다. 각 패널의 container 전환, 가로 overflow, 독립 스크롤, Portal 잘림과 separator 키보드 조작을 확인한다.

## 7. 접근성

- 입력에는 연결된 `label`과 오류 설명을 제공한다.
- 버튼과 링크의 의미를 구분한다.
- Dialog가 열리면 focus 이동, Escape 닫기와 focus 복귀를 보장한다.
- 키보드만으로 주요 흐름을 수행할 수 있어야 한다.
- 터치 대상은 가능하면 최소 44×44px을 확보한다.
- 로딩, 성공과 오류 상태는 스크린 리더가 인식할 수 있도록 구성한다.

## 8. 화면 상태

데이터 화면은 범위에 맞게 로딩, 빈 상태, 오류, 권한 없음과 성공 상태를 설계한다. 오류 메시지는 사용자가 다음 행동을 선택할 수 있게 작성하고 내부 DB 또는 인증 세부사항을 노출하지 않는다.
