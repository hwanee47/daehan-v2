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

## 7. 접근성

- 입력에는 연결된 `label`과 오류 설명을 제공한다.
- 버튼과 링크의 의미를 구분한다.
- Dialog가 열리면 focus 이동, Escape 닫기와 focus 복귀를 보장한다.
- 키보드만으로 주요 흐름을 수행할 수 있어야 한다.
- 터치 대상은 가능하면 최소 44×44px을 확보한다.
- 로딩, 성공과 오류 상태는 스크린 리더가 인식할 수 있도록 구성한다.

## 8. 화면 상태

데이터 화면은 범위에 맞게 로딩, 빈 상태, 오류, 권한 없음과 성공 상태를 설계한다. 오류 메시지는 사용자가 다음 행동을 선택할 수 있게 작성하고 내부 DB 또는 인증 세부사항을 노출하지 않는다.
