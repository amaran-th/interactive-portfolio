"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Settings, X } from "lucide-react";
import { toPng } from "html-to-image";
import Image from "next/image";
import AssetAreaChart from "./AssetAreaChart";
import ComparisonBarChart from "./ComparisonBarChart";
import CustomSelect from "./CustomSelect";
import ExportMenu from "./ExportMenu";
import FlowDiagram from "./FlowDiagram";
import FlowRatioChart from "./FlowRatioChart";
import GroupDonutChart from "./GroupDonutChart";
import HistoryPanel from "./HistoryPanel";
import ImportScenarioButton from "./ImportScenarioButton";
import InputPanel from "./InputPanel";
import ScenarioComparisonChart from "./ScenarioComparisonChart";
import ScenarioTabs from "./ScenarioTabs";
import Switch from "./Switch";
import {
  exportScenarioJson,
  exportSnapshotsCsv,
  parseScenarioJson,
  todayStamp,
} from "./exportUtils";
import { findGoalAchievementMonth } from "./simulation";
import {
  DEFAULT_HORIZON_YEARS,
  GROUP_PALETTE,
  Goal,
  HORIZON_PRESET_YEARS,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  RepeatSchedule,
  Scenario,
  SimulationInput,
  addMonths,
  newId,
  toMonthInputValue,
} from "./types";
import { useSimulation } from "./useSimulation";

const CHART_PANEL_COUNT_ARRAY = [0, 1, 2, 3] as const;
/** Wide enough to push every chart breakpoint (@min-[900px]/[1000px]) past
 * its threshold, so PNG export always captures the desktop grid layout. */
const CHART_EXPORT_WIDTH = 1400;

const ONBOARDING_IMAGE_BASE = "/playground/asset-simulator/onboarding";

type OnboardingSlide = {
  label: string;
  description: string;
  desktopImage: string;
  mobileImage: string;
};

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    label: "입력 패널",
    description:
      "보유 자산과 수입·지출, 자산 간 이체 규칙을 등록하면 시뮬레이션에 바로 반영됩니다. 매달 반복되는 항목과 1회성 항목을 구분해서 넣을 수 있어요.",
    desktopImage: `${ONBOARDING_IMAGE_BASE}/input-panel-desktop.png`,
    mobileImage: `${ONBOARDING_IMAGE_BASE}/input-panel-mobile.png`,
  },
  {
    label: "자산 추이 · 자금 흐름",
    description:
      "슬라이더로 시점을 옮기면 자산 변화 그래프와 그 달의 수입·지출 흐름이 함께 바뀝니다.",
    desktopImage: `${ONBOARDING_IMAGE_BASE}/asset-flow-desktop.png`,
    mobileImage: `${ONBOARDING_IMAGE_BASE}/asset-flow-mobile.png`,
  },
  {
    label: "비교 · 비율 · 구성",
    description:
      "지금과 미래 시점의 자산을 막대로 비교하고, 자산 구성과 수입·지출 비율은 도넛 차트로 한눈에 볼 수 있어요.",
    desktopImage: `${ONBOARDING_IMAGE_BASE}/compare-ratio-desktop.png`,
    mobileImage: `${ONBOARDING_IMAGE_BASE}/compare-ratio-mobile.png`,
  },
  {
    label: "누적 이력",
    description:
      "슬라이더로 옮긴 시점까지의 수입·지출·이체 내역을 월별로 모아 보여줍니다. PC 화면에서만 제공돼요.",
    // PC 화면 폭에서만 제공되는 기능이라 모바일 전용 이미지는 없다.
    desktopImage: `${ONBOARDING_IMAGE_BASE}/history-desktop.png`,
    mobileImage: `${ONBOARDING_IMAGE_BASE}/history-desktop.png`,
  },
  {
    label: "시나리오",
    description:
      "여러 시나리오를 만들어 나란히 비교할 수 있어요. 막막하다면 예시 시나리오부터 살펴보세요.",
    desktopImage: `${ONBOARDING_IMAGE_BASE}/scenario-desktop.png`,
    mobileImage: `${ONBOARDING_IMAGE_BASE}/scenario-mobile.png`,
  },
];

function goalReferences(
  goal: Goal | null,
  kind: "asset" | "group",
  id: string,
): boolean {
  if (!goal) return false;
  if (kind === "asset") {
    return goal.metric.type === "asset" && goal.metric.assetId === id;
  }
  return goal.metric.type === "group" && goal.metric.groupId === id;
}

function emptyScenario(name: string): Scenario {
  return {
    id: newId(),
    name,
    groups: [],
    categories: [],
    // Every scenario needs exactly one primary asset — income flows into
    // it and expenses flow out of it — so one is seeded here rather than
    // left for the user to designate later (that manual step was removed;
    // see AssetSimulator's asset handlers).
    assetClasses: [
      {
        id: newId(),
        name: "기본 자산",
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: true,
        color: GROUP_PALETTE[0],
      },
    ],
    incomes: [],
    expenses: [],
    transferRules: [],
    exchangeRate: 1350,
    goal: null,
    inflationEnabled: false,
    inflationRate: 3,
  };
}

// 첫 로드 시 온보딩용으로 예시 데이터를 채운 시나리오. 사용자의 실제 수정이
// 아니므로 dirty 플래그와 무관하게, 어떤 핸들러도 거치지 않고 초기 state로
// 직접 넣는다.
function seedScenario(name: string, today: Date): Scenario {
  const primaryId = newId();
  const savingsId = newId();
  const spId = newId();
  const samsungId = newId();
  const savingsGroupId = newId();
  const investGroupId = newId();
  const monthlyRecurring = (startDate: string): RepeatSchedule => ({
    mode: "recurring",
    startDate,
    frequency: "monthly",
    until: { type: "indefinite" },
  });
  const nextMonth = toMonthInputValue(addMonths(today, 1));

  return {
    id: newId(),
    name,
    // 그룹 색과 미분류 자산 색은 같은 팔레트를 공유하는 하나의 시퀀스라
    // 겹치지 않게 순서대로 배정한다 (0: 예적금, 1: 투자, 2: 파킹통장).
    // 그룹에 속한 자산의 color는 화면에 쓰이지 않는 값이라 무의미하다.
    groups: [
      { id: savingsGroupId, name: "예적금", color: GROUP_PALETTE[0] },
      { id: investGroupId, name: "투자", color: GROUP_PALETTE[1] },
    ],
    categories: [],
    assetClasses: [
      {
        id: primaryId,
        name: "파킹통장",
        currency: "KRW",
        initialBalance: 1_000_000,
        annualReturnRate: 0,
        isPrimary: true,
        color: GROUP_PALETTE[2],
      },
      {
        id: savingsId,
        name: "청년미래적금",
        groupId: savingsGroupId,
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: false,
        color: GROUP_PALETTE[3],
      },
      {
        id: spId,
        name: "S&P500",
        groupId: investGroupId,
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: false,
        color: GROUP_PALETTE[4],
      },
      {
        id: samsungId,
        name: "삼성전자",
        groupId: investGroupId,
        currency: "KRW",
        initialBalance: 0,
        annualReturnRate: 0,
        isPrimary: false,
        color: GROUP_PALETTE[5],
      },
    ],
    incomes: [
      {
        id: newId(),
        name: "아르바이트 월급",
        amount: 1_100_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "성적 장학금",
        amount: 500_000,
        schedule: { mode: "once", date: nextMonth },
      },
      {
        id: newId(),
        name: "청년미래적금 정부기여금+이자",
        amount: 2_000_000,
        schedule: { mode: "once", date: toMonthInputValue(addMonths(today, 36)) },
      },
    ],
    expenses: [
      {
        id: newId(),
        name: "생활비",
        amount: 200_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "식비",
        amount: 100_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "월세",
        amount: 150_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        name: "휴대폰 할부",
        amount: 150_000,
        schedule: {
          mode: "recurring",
          startDate: nextMonth,
          frequency: "monthly",
          until: { type: "count", count: 3 },
        },
      },
      {
        id: newId(),
        name: "일본여행",
        amount: 500_000,
        schedule: { mode: "once", date: toMonthInputValue(addMonths(today, 4)) },
      },
    ],
    transferRules: [
      {
        id: newId(),
        fromAssetId: primaryId,
        toAssetId: savingsId,
        mode: "fixed",
        amount: 500_000,
        // 3년 만기 적금 - 만기 시점까지만 납입
        schedule: {
          mode: "recurring",
          startDate: nextMonth,
          frequency: "monthly",
          until: { type: "count", count: 36 },
        },
      },
      {
        id: newId(),
        fromAssetId: savingsId,
        toAssetId: primaryId,
        mode: "percentOfSource",
        amount: 100,
        // 3년 뒤 만기 - 잔액 전액을 기본 자산으로 이체
        schedule: { mode: "once", date: toMonthInputValue(addMonths(today, 36)) },
      },
      {
        id: newId(),
        fromAssetId: primaryId,
        toAssetId: spId,
        mode: "fixed",
        amount: 100_000,
        schedule: monthlyRecurring(nextMonth),
      },
      {
        id: newId(),
        fromAssetId: primaryId,
        toAssetId: samsungId,
        mode: "fixed",
        amount: 100_000,
        schedule: monthlyRecurring(nextMonth),
      },
    ],
    exchangeRate: 1350,
    goal: null,
    inflationEnabled: false,
    inflationRate: 3,
  };
}

function duplicateScenario(scenario: Scenario): Scenario {
  const groupIdMap = new Map(scenario.groups.map((g) => [g.id, newId()]));
  const categoryIdMap = new Map(
    scenario.categories.map((c) => [c.id, newId()]),
  );
  const assetIdMap = new Map(scenario.assetClasses.map((a) => [a.id, newId()]));

  const groups = scenario.groups.map((g) => ({
    ...g,
    id: groupIdMap.get(g.id)!,
  }));
  const categories = scenario.categories.map((c) => ({
    ...c,
    id: categoryIdMap.get(c.id)!,
  }));
  const assetClasses = scenario.assetClasses.map((a) => ({
    ...a,
    id: assetIdMap.get(a.id)!,
    groupId: a.groupId ? groupIdMap.get(a.groupId) : undefined,
  }));
  const incomes = scenario.incomes.map((i) => ({
    ...i,
    id: newId(),
    categoryId: i.categoryId ? categoryIdMap.get(i.categoryId) : undefined,
  }));
  const expenses = scenario.expenses.map((e) => ({
    ...e,
    id: newId(),
    categoryId: e.categoryId ? categoryIdMap.get(e.categoryId) : undefined,
  }));
  const transferRules = scenario.transferRules.map((r) => ({
    ...r,
    id: newId(),
    fromAssetId: assetIdMap.get(r.fromAssetId)!,
    toAssetId: assetIdMap.get(r.toAssetId)!,
  }));
  const goal = scenario.goal
    ? {
        ...scenario.goal,
        metric:
          scenario.goal.metric.type === "asset"
            ? {
                type: "asset" as const,
                assetId: assetIdMap.get(scenario.goal.metric.assetId)!,
              }
            : scenario.goal.metric.type === "group"
              ? {
                  type: "group" as const,
                  groupId: groupIdMap.get(scenario.goal.metric.groupId)!,
                }
              : scenario.goal.metric,
      }
    : null;

  return {
    id: newId(),
    name: `${scenario.name} 복사본`,
    groups,
    categories,
    assetClasses,
    incomes,
    expenses,
    transferRules,
    exchangeRate: scenario.exchangeRate,
    goal,
    inflationEnabled: scenario.inflationEnabled,
    inflationRate: scenario.inflationRate,
  };
}

export default function AssetSimulator() {
  const today = useMemo(() => new Date(), []);

  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    seedScenario("예시 시나리오", today),
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState(
    () => scenarios[0].id,
  );
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);
  const [isDirty, setIsDirty] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const carouselScrollRef = useRef<HTMLDivElement>(null);

  // The dots/arrows drive the scroll position directly; a native scroll-snap
  // strip (see the mobile carousel markup) handles the swipe gesture itself,
  // and this listener keeps `activeChartIndex` (for the dots) in sync with
  // wherever the user's swipe actually lands.
  const handleCarouselScroll = () => {
    const el = carouselScrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(
      0,
      Math.min(CHART_PANEL_COUNT_ARRAY.length - 1, index),
    );
    setActiveChartIndex((prev) => (prev === clamped ? prev : clamped));
  };
  const scrollToChartIndex = (index: number) => {
    const el = carouselScrollRef.current;
    if (el) {
      el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    }
    setActiveChartIndex(index);
  };
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [inputPanelCollapsed, setInputPanelCollapsed] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const onboardingScrollRef = useRef<HTMLDivElement>(null);
  const onboardingScrollSettleRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Debounced rather than updated on every scroll event, so the label/
  // description switch once after the (smooth-scroll or drag) motion
  // actually settles instead of flickering through intermediate slides
  // while it's still animating.
  const handleOnboardingScroll = () => {
    const el = onboardingScrollRef.current;
    if (!el || el.clientWidth === 0) return;
    if (onboardingScrollSettleRef.current) {
      clearTimeout(onboardingScrollSettleRef.current);
    }
    onboardingScrollSettleRef.current = setTimeout(() => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      const clamped = Math.max(
        0,
        Math.min(ONBOARDING_SLIDES.length - 1, index),
      );
      setOnboardingSlide((prev) => (prev === clamped ? prev : clamped));
    }, 120);
  };
  const scrollToOnboardingSlide = (index: number) => {
    const el = onboardingScrollRef.current;
    if (el) {
      el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    }
  };
  // The strip's native overflow-x-auto + scroll-snap already handles touch
  // swipe. Mouse click-drag doesn't scroll a div natively, so it's wired up
  // by hand here for desktop.
  const handleOnboardingMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = onboardingScrollRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startScrollLeft = el.scrollLeft;
    let dragged = false;
    // CSS scroll-snap otherwise fights the manual scrollLeft writes below,
    // yanking the strip to the nearest slide mid-drag instead of following
    // the cursor. Suspend it for the duration of the gesture.
    el.style.scrollSnapType = "none";

    const handleMove = (moveEvent: MouseEvent) => {
      dragged = true;
      el.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
    };
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      el.style.scrollSnapType = "";
      if (!dragged || el.clientWidth === 0) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      scrollToOnboardingSlide(
        Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, index)),
      );
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("asset-simulator-onboarding-seen");
    if (!seen) {
      setOnboardingOpen(true);
      setOnboardingSlide(0);
      window.localStorage.setItem("asset-simulator-onboarding-seen", "1");
    }
  }, []);
  const chartsColumnRef = useRef<HTMLDivElement>(null);
  const pageScrollRef = useRef<HTMLDivElement>(null);
  const [chartsColumnHeight, setChartsColumnHeight] = useState<number | null>(
    null,
  );

  const horizonMonths = horizonYears * 12;

  // 누적 이력 패널이 왼쪽 차트 열과 같은 높이만큼만 차지하고 그 안에서
  // 스크롤되도록, 실제 렌더링된 차트 열 높이를 측정해 넘겨준다. CSS
  // grid만으로는 "내 콘텐츠 크기와 무관하게 형제 크기를 따라간다"를
  // 표현할 수 없어(둘 중 더 큰 쪽에 행 높이가 맞춰짐) 직접 측정한다.
  useEffect(() => {
    const el = chartsColumnRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setChartsColumnHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleChangeHorizon = (years: number) => {
    setHorizonYears(years);
    setSelectedMonth((prev) => Math.min(prev, years * 12));
  };

  const updateActiveScenario = (updater: (scenario: Scenario) => Scenario) => {
    setIsDirty(true);
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? updater(s) : s)),
    );
  };

  const handleSelectScenario = (id: string) => setActiveScenarioId(id);

  const handleRenameScenario = (id: string, name: string) => {
    setIsDirty(true);
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    setIsDirty(true);
    const rest = scenarios.filter((s) => s.id !== id);
    setScenarios(rest);
    if (activeScenarioId === id) {
      setActiveScenarioId(rest[0].id);
    }
  };

  const handleDuplicateScenario = (id: string) => {
    const source = scenarios.find((s) => s.id === id);
    if (!source) return;
    setIsDirty(true);
    const clone = duplicateScenario(source);
    setScenarios((prev) => [...prev, clone]);
    setActiveScenarioId(clone.id);
  };

  const handleCreateScenario = () => {
    setIsDirty(true);
    const existingNames = new Set(scenarios.map((s) => s.name));
    let n = 1;
    while (existingNames.has(`시나리오 ${n}`)) n++;
    const created = emptyScenario(`시나리오 ${n}`);
    setScenarios((prev) => [...prev, created]);
    setActiveScenarioId(created.id);
  };

  const handleExportScenarioJson = () => {
    exportScenarioJson(activeScenario);
  };

  const handleImportScenarioJson = async (file: File) => {
    const text = await file.text();
    const imported = parseScenarioJson(text);
    if (!imported) {
      window.alert("시나리오 파일을 읽을 수 없습니다. 올바른 JSON 파일인지 확인해주세요.");
      return;
    }
    setIsDirty(true);
    setScenarios((prev) => [...prev, imported]);
    setActiveScenarioId(imported.id);
  };

  const handleExportCsv = () => {
    exportSnapshotsCsv(
      snapshots,
      activeScenario.assetClasses,
      today,
      activeScenario.name,
    );
  };

  const handleExportChartImage = async () => {
    if (typeof window === "undefined" || isExportingImage) return;
    const el = chartsColumnRef.current;
    if (!el) return;
    // Swapping to (and back from) export mode changes each chart's content
    // height (sliders/toggles disappear and reappear), which shifts this
    // scroll position as a side effect. Pin it back afterward.
    const scrollEl = pageScrollRef.current;
    const savedScrollTop = scrollEl?.scrollTop ?? 0;
    setIsExportingImage(true);
    // Everything below can throw (cloning, toPng, image decoding) — keep it
    // all inside try/finally so a mid-export failure can never leave
    // isExportingImage stuck true (which would permanently hide sliders/
    // toggles and force the chart grids into their export-only flex layout).
    let clone: HTMLElement | null = null;
    try {
      // setIsExportingImage triggers the export-mode (static text) re-render
      // in every chart, but React commits that update asynchronously — wait
      // two frames so it's actually painted before toPng clones the DOM.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      // Clone and resize the CLONE (not the live element) to the desktop
      // export width. toPng's own width/style overrides only resize the
      // output canvas, not the actual grid — the container-query grid never
      // relayouts to the wider width, leaving blank space on the right where
      // content should be. Cloning forces a real browser relayout at the new
      // width without touching the live page. Positioned on-screen but
      // hidden behind the app's own opaque background via a very low z-index
      // — NOT via opacity/visibility, which html-to-image faithfully
      // reproduces in the capture too (an invisible clone captures as a
      // blank image), and NOT parked far off-screen either, which some
      // browsers skip properly rasterizing.
      clone = el.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.top = "0";
      clone.style.left = "0";
      clone.style.width = `${CHART_EXPORT_WIDTH}px`;
      clone.style.pointerEvents = "none";
      clone.style.zIndex = "-9999";
      clone.style.background =
        "linear-gradient(to bottom right, #e0e7ff, #eff6ff, #f3e8ff)";
      clone.style.padding = "24px";
      document.body.appendChild(clone);
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const cloneRect = clone.getBoundingClientRect();
      const dataUrl = await toPng(clone, {
        cacheBust: true,
        pixelRatio: 2,
        width: cloneRect.width,
        height: cloneRect.height,
      });
      const link = document.createElement("a");
      link.download = `자산시뮬레이터_그래프_${activeScenario.name}_${todayStamp()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      if (clone) document.body.removeChild(clone);
      setIsExportingImage(false);
      // Same double-rAF wait as on entry — a single frame isn't enough for
      // the revert-to-interactive re-render (content growing back to full
      // height) to actually paint, so scrollTo would get silently clamped
      // by the still-short scrollHeight and never reach savedScrollTop.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollEl?.scrollTo({ top: savedScrollTop });
        });
      });
    }
  };

  const handleAddGroup = (name: string, color: string): string => {
    const id = newId();
    updateActiveScenario((s) => ({
      ...s,
      groups: [...s.groups, { id, name, color }],
    }));
    return id;
  };
  const handleUpdateGroup = (
    id: string,
    input: { name: string; color: string },
  ) => {
    updateActiveScenario((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...input } : g)),
    }));
  };
  const handleRemoveGroup = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      groups: s.groups.filter((g) => g.id !== id),
      assetClasses: s.assetClasses.map((a) =>
        a.groupId === id ? { ...a, groupId: undefined } : a,
      ),
      goal: goalReferences(s.goal, "group", id) ? null : s.goal,
    }));
  };

  // 수입/지출 카테고리는 자산 그룹과 달리 색이 없는 별도의 분류 체계다.
  const handleAddCategory = (name: string): string => {
    const id = newId();
    updateActiveScenario((s) => ({
      ...s,
      categories: [...s.categories, { id, name }],
    }));
    return id;
  };
  const handleUpdateCategory = (id: string, name: string) => {
    updateActiveScenario((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
  };
  const handleRemoveCategory = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      incomes: s.incomes.map((i) =>
        i.categoryId === id ? { ...i, categoryId: undefined } : i,
      ),
      expenses: s.expenses.map((e) =>
        e.categoryId === id ? { ...e, categoryId: undefined } : e,
      ),
    }));
  };

  const handleAddAssetClass = (input: NewAssetClassInput) => {
    updateActiveScenario((s) => ({
      ...s,
      // Newly added assets are never primary — the primary asset is fixed
      // at scenario creation.
      assetClasses: [...s.assetClasses, { id: newId(), ...input, isPrimary: false }],
    }));
  };
  const handleUpdateAssetClass = (id: string, input: NewAssetClassInput) => {
    updateActiveScenario((s) => {
      const nextAssetClasses = s.assetClasses.map((a) => {
        if (a.id !== id) return a;
        // The primary asset can't become a liability — income/expense
        // flow through it, which assumes a non-negative balance. The form
        // already disables the liability checkbox while editing it; this
        // is the backing guard against a stale negative value slipping in.
        const initialBalance = a.isPrimary
          ? Math.abs(input.initialBalance)
          : input.initialBalance;
        return { ...a, ...input, initialBalance };
      });
      const nextTransferRules = s.transferRules.filter((r) => {
        const from = nextAssetClasses.find((a) => a.id === r.fromAssetId);
        const to = nextAssetClasses.find((a) => a.id === r.toAssetId);
        return from && to && from.currency === to.currency;
      });
      return {
        ...s,
        assetClasses: nextAssetClasses,
        transferRules: nextTransferRules,
      };
    });
  };
  const handleChangeAssetColor = (id: string, color: string) => {
    updateActiveScenario((s) => ({
      ...s,
      assetClasses: s.assetClasses.map((a) =>
        a.id === id ? { ...a, color } : a,
      ),
    }));
  };
  const handleRemoveAssetClass = (id: string) => {
    updateActiveScenario((s) => {
      const removed = s.assetClasses.find((a) => a.id === id);
      // The primary asset can't be removed — every scenario always needs
      // exactly one (income flows into it, expenses flow out of it).
      if (removed?.isPrimary) return s;
      return {
        ...s,
        assetClasses: s.assetClasses.filter((a) => a.id !== id),
        transferRules: s.transferRules.filter(
          (r) => r.fromAssetId !== id && r.toAssetId !== id,
        ),
        goal: goalReferences(s.goal, "asset", id) ? null : s.goal,
      };
    });
  };

  const reorderArray = <T,>(list: T[], from: number, to: number): T[] => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const handleAddIncome = (input: NewIncomeItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: [...s.incomes, { id: newId(), ...input }],
    }));
  };
  const handleUpdateIncome = (id: string, input: NewIncomeItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...input } : i)),
    }));
  };
  const handleRemoveIncome = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: s.incomes.filter((i) => i.id !== id),
    }));
  };
  const handleReorderIncome = (from: number, to: number) => {
    updateActiveScenario((s) => ({
      ...s,
      incomes: reorderArray(s.incomes, from, to),
    }));
  };

  const handleAddExpense = (input: NewExpenseItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: [...s.expenses, { id: newId(), ...input }],
    }));
  };
  const handleUpdateExpense = (id: string, input: NewExpenseItemInput) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...input } : e)),
    }));
  };
  const handleRemoveExpense = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }));
  };
  const handleReorderExpense = (from: number, to: number) => {
    updateActiveScenario((s) => ({
      ...s,
      expenses: reorderArray(s.expenses, from, to),
    }));
  };

  const handleAddTransferRule = (input: NewTransferRuleInput) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: [...s.transferRules, { id: newId(), ...input }],
    }));
  };
  const handleUpdateTransferRule = (
    id: string,
    input: NewTransferRuleInput,
  ) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: s.transferRules.map((r) =>
        r.id === id ? { ...r, ...input } : r,
      ),
    }));
  };
  const handleRemoveTransferRule = (id: string) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: s.transferRules.filter((r) => r.id !== id),
    }));
  };
  const handleReorderTransferRule = (from: number, to: number) => {
    updateActiveScenario((s) => ({
      ...s,
      transferRules: reorderArray(s.transferRules, from, to),
    }));
  };

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];

  const simulationInput = useMemo<SimulationInput>(
    () => ({
      groups: activeScenario.groups,
      assetClasses: activeScenario.assetClasses,
      incomes: activeScenario.incomes,
      expenses: activeScenario.expenses,
      transferRules: activeScenario.transferRules,
      exchangeRate: activeScenario.exchangeRate,
    }),
    [activeScenario],
  );

  const handleSetGoal = (goal: Goal | null) => {
    updateActiveScenario((s) => ({ ...s, goal }));
    if (goal) {
      const achievementMonth = findGoalAchievementMonth(
        simulationInput,
        goal,
        today,
      );
      if (achievementMonth !== null && achievementMonth <= horizonMonths) {
        setSelectedMonth(achievementMonth);
      }
    }
  };

  const handleToggleInflation = () => {
    updateActiveScenario((s) => ({
      ...s,
      inflationEnabled: !s.inflationEnabled,
    }));
  };

  const handleSetInflationRate = (rate: number) => {
    updateActiveScenario((s) => ({ ...s, inflationRate: rate }));
  };

  const snapshots = useSimulation(simulationInput, today, horizonMonths);
  const selectedSnapshot = snapshots[selectedMonth];
  const primaryAsset = activeScenario.assetClasses.find((a) => a.isPrimary);
  const assetGroups = activeScenario.groups.filter((g) =>
    activeScenario.assetClasses.some((a) => a.groupId === g.id),
  );

  return (
    <div
      ref={pageScrollRef}
      className="h-full w-full overflow-y-auto bg-linear-to-br from-indigo-100 via-blue-50 to-purple-100 text-gray-800"
    >
      <div className="sticky top-0 z-40 bg-linear-to-br from-indigo-100 via-blue-50 to-purple-100 px-4 pt-4 pb-3 shadow-[0_4px_10px_-6px_rgba(0,0,0,0.15)]">
        <div className="mx-auto max-w-400 @container">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold text-gray-800">자산 시뮬레이터</h2>
              <button
                type="button"
                onClick={() => {
                  setOnboardingOpen(true);
                  setOnboardingSlide(0);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/60 text-xs font-semibold text-gray-500 hover:bg-white hover:text-gray-700"
                aria-label="사용법 보기"
              >
                ?
              </button>
            </div>
            <div className="hidden items-center gap-3 @min-[500px]:flex">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                환율(1달러 = 원)
                <input
                  type="number"
                  min={1}
                  value={activeScenario.exchangeRate}
                  onChange={(e) =>
                    updateActiveScenario((s) => ({
                      ...s,
                      exchangeRate: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-24 rounded-full border border-white/60 bg-white/80 px-2 py-1 text-sm"
                />
              </label>
              <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-gray-600">
                <Switch
                  checked={activeScenario.inflationEnabled}
                  onChange={handleToggleInflation}
                  label="물가상승률 반영"
                />
                <div className="h-4 w-px bg-white/60" />
                <input
                  type="number"
                  value={activeScenario.inflationRate}
                  onChange={(e) =>
                    handleSetInflationRate(Number(e.target.value) || 0)
                  }
                  disabled={!activeScenario.inflationEnabled}
                  className={`w-12 rounded-full border px-2 py-1 text-xs outline-none ${
                    activeScenario.inflationEnabled
                      ? "border-white/60 bg-white/80 focus:border-gray-400"
                      : "cursor-not-allowed border-transparent bg-white/30 text-gray-400"
                  }`}
                />
                <span
                  className={
                    activeScenario.inflationEnabled ? "" : "text-gray-400"
                  }
                >
                  % (연간)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-gray-600 @min-[500px]:hidden"
            >
              <Settings className="h-3.5 w-3.5" /> 상세 설정
            </button>
          </div>

          <ScenarioTabs
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            onSelect={handleSelectScenario}
            onRename={handleRenameScenario}
            onDelete={handleDeleteScenario}
            onDuplicate={handleDuplicateScenario}
            onCreate={handleCreateScenario}
            showComparison={showComparison}
            onToggleComparison={() => setShowComparison((prev) => !prev)}
          />
        </div>
      </div>

      {mobileSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setMobileSettingsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">상세 설정</h3>
              <button
                type="button"
                onClick={() => setMobileSettingsOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between gap-2 text-sm text-gray-600">
                환율(1달러 = 원)
                <input
                  type="number"
                  min={1}
                  value={activeScenario.exchangeRate}
                  onChange={(e) =>
                    updateActiveScenario((s) => ({
                      ...s,
                      exchangeRate: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-28 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
                />
              </label>
              <div className="flex flex-col gap-2 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-2">
                  <span>물가상승률 반영</span>
                  <Switch
                    checked={activeScenario.inflationEnabled}
                    onChange={handleToggleInflation}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={activeScenario.inflationRate}
                    onChange={(e) =>
                      handleSetInflationRate(Number(e.target.value) || 0)
                    }
                    disabled={!activeScenario.inflationEnabled}
                    className={`w-14 rounded-full border px-2 py-1 text-sm outline-none ${
                      activeScenario.inflationEnabled
                        ? "border-gray-200 bg-white focus:border-gray-400"
                        : "cursor-not-allowed border-transparent bg-gray-100 text-gray-400"
                    }`}
                  />
                  <span
                    className={
                      activeScenario.inflationEnabled ? "" : "text-gray-400"
                    }
                  >
                    % (연간)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {onboardingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setOnboardingOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">
                자산 시뮬레이터 사용법
              </h3>
              <button
                type="button"
                onClick={() => setOnboardingOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <div
                ref={onboardingScrollRef}
                onScroll={handleOnboardingScroll}
                onMouseDown={handleOnboardingMouseDown}
                onDragStart={(e) => e.preventDefault()}
                className="flex cursor-grab snap-x snap-mandatory overflow-x-auto overscroll-x-contain select-none active:cursor-grabbing"
                style={{ scrollbarWidth: "none" }}
              >
                {ONBOARDING_SLIDES.map((slide) => (
                  <div
                    key={slide.label}
                    className="w-full shrink-0 snap-start px-0.5"
                  >
                    <div className="relative h-48 w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                      <Image
                        src={slide.desktopImage}
                        alt={slide.label}
                        fill
                        className="hidden object-contain object-center min-[500px]:block"
                      />
                      <Image
                        src={slide.mobileImage}
                        alt={slide.label}
                        fill
                        className="block object-contain object-center min-[500px]:hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                {onboardingSlide + 1}/{ONBOARDING_SLIDES.length}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-800">
                {ONBOARDING_SLIDES[onboardingSlide].label}
              </p>
              <p className="mt-0.5 text-sm text-gray-600">
                {ONBOARDING_SLIDES[onboardingSlide].description}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  scrollToOnboardingSlide(Math.max(0, onboardingSlide - 1))
                }
                disabled={onboardingSlide === 0}
                className="text-gray-400 disabled:opacity-30"
                aria-label="이전"
              >
                ‹
              </button>
              <div className="flex gap-1.5">
                {ONBOARDING_SLIDES.map((slide, i) => (
                  <button
                    key={slide.label}
                    type="button"
                    onClick={() => scrollToOnboardingSlide(i)}
                    aria-label={`${i + 1}번째로 이동`}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === onboardingSlide ? "bg-indigo-500" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  scrollToOnboardingSlide(
                    Math.min(ONBOARDING_SLIDES.length - 1, onboardingSlide + 1),
                  )
                }
                disabled={onboardingSlide === ONBOARDING_SLIDES.length - 1}
                className="text-gray-400 disabled:opacity-30"
                aria-label="다음"
              >
                ›
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOnboardingOpen(false)}
              className="mt-4 w-full rounded-full bg-indigo-500 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              시작하기
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-400 @container px-4 pt-4 pb-4">
        <div className="relative z-30 mb-3 flex items-center justify-end gap-1.5">
          <ImportScenarioButton onImportJson={handleImportScenarioJson} />
          <ExportMenu
            onExportJson={handleExportScenarioJson}
            onExportCsv={handleExportCsv}
            onExportImage={handleExportChartImage}
            isExportingImage={isExportingImage}
          />
        </div>

        {showComparison && (
          <ScenarioComparisonChart
            scenarios={scenarios}
            today={today}
            horizonMonths={horizonMonths}
            selectedMonth={selectedMonth}
          />
        )}

        <div
          className={`transition-[margin] duration-300 ${
            inputPanelCollapsed ? "mb-0 @min-[500px]:mb-4" : "mb-4"
          }`}
        >
          <button
            type="button"
            onClick={() => setInputPanelCollapsed((prev) => !prev)}
            className="mb-2 hidden w-full items-center justify-end gap-1 px-1 text-xs text-gray-500 @max-[500px]:flex"
          >
            입력패널 {inputPanelCollapsed ? "펼치기" : "접기"}
            <ChevronDown
              className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                inputPanelCollapsed ? "" : "rotate-180"
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out @min-[500px]:grid-rows-[1fr] ${
              inputPanelCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            }`}
          >
          <div className="overflow-hidden @min-[500px]:overflow-visible">
          <InputPanel
            key={activeScenarioId}
            groups={activeScenario.groups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            categories={activeScenario.categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onRemoveCategory={handleRemoveCategory}
            assetClasses={activeScenario.assetClasses}
            onAddAssetClass={handleAddAssetClass}
            onUpdateAssetClass={handleUpdateAssetClass}
            onRemoveAssetClass={handleRemoveAssetClass}
            onChangeAssetColor={handleChangeAssetColor}
            incomes={activeScenario.incomes}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onRemoveIncome={handleRemoveIncome}
            onReorderIncome={handleReorderIncome}
            expenses={activeScenario.expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onRemoveExpense={handleRemoveExpense}
            onReorderExpense={handleReorderExpense}
            transferRules={activeScenario.transferRules}
            onAddTransferRule={handleAddTransferRule}
            onUpdateTransferRule={handleUpdateTransferRule}
            onRemoveTransferRule={handleRemoveTransferRule}
            onReorderTransferRule={handleReorderTransferRule}
            today={today}
            horizonMonths={horizonMonths}
          />
          </div>
          </div>
        </div>

        <div className="grid gap-4 @min-[1400px]:grid-cols-[minmax(280px,1fr)_minmax(180px,320px)]">
          <div ref={chartsColumnRef} className="@container flex flex-col gap-4">
            <div
              className={
                isExportingImage
                  ? "hidden"
                  : "hidden items-center gap-1 @min-[500px]:flex"
              }
            >
              {HORIZON_PRESET_YEARS.map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => handleChangeHorizon(years)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    horizonYears === years
                      ? "bg-indigo-500 text-white"
                      : "bg-white/80 text-gray-600"
                  }`}
                >
                  {years}년
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <div
                className={
                  isExportingImage
                    ? "flex gap-4"
                    : "grid grid-cols-1 gap-4 @min-[900px]:grid-cols-2"
                }
              >
                <div className={isExportingImage ? "min-w-80 flex-1" : "min-w-80"}>
                  <AssetAreaChart
                    snapshots={snapshots}
                    groups={assetGroups}
                    assetClasses={activeScenario.assetClasses}
                    selectedMonth={selectedMonth}
                    onChangeMonth={setSelectedMonth}
                    today={today}
                    horizonMonths={horizonMonths}
                    goal={activeScenario.goal}
                    onSetGoal={handleSetGoal}
                    simulationInput={simulationInput}
                    inflationEnabled={activeScenario.inflationEnabled}
                    inflationRate={activeScenario.inflationRate}
                    horizonSelector={
                      <div className="@min-[500px]:hidden">
                        <CustomSelect
                          compact
                          value={String(horizonYears)}
                          onChange={(v) => handleChangeHorizon(Number(v))}
                          options={HORIZON_PRESET_YEARS.map((years) => ({
                            value: String(years),
                            label: `${years}년`,
                          }))}
                        />
                      </div>
                    }
                    exportMode={isExportingImage}
                  />
                </div>
                {/* Desktop/tablet only — below 500px this same chart moves
                into the swipeable strip further down instead. */}
                <div
                  className={
                    isExportingImage
                      ? "min-w-80 flex-1"
                      : "hidden min-w-80 @min-[500px]:block"
                  }
                >
                  <FlowDiagram
                    snapshot={selectedSnapshot}
                    previousSnapshot={
                      selectedMonth > 0 ? snapshots[selectedMonth - 1] : undefined
                    }
                    primaryAsset={primaryAsset}
                    assetClasses={activeScenario.assetClasses}
                    groups={activeScenario.groups}
                    exchangeRate={activeScenario.exchangeRate}
                    inflationEnabled={activeScenario.inflationEnabled}
                    inflationRate={activeScenario.inflationRate}
                    exportMode={isExportingImage}
                  />
                </div>
              </div>
              {/* Desktop/tablet only — the mobile carousel strip below
              covers this same set of panels under 500px. */}
              <div
                className={
                  isExportingImage
                    ? "flex gap-4"
                    : "hidden @min-[500px]:grid grid-cols-2 gap-4 @min-[1000px]:grid-cols-4"
                }
              >
                <div className={isExportingImage ? "min-w-50 flex-1" : "min-w-50"}>
                  <ComparisonBarChart
                    snapshots={snapshots}
                    groups={assetGroups}
                    assetClasses={activeScenario.assetClasses}
                    selectedMonth={selectedMonth}
                    inflationEnabled={activeScenario.inflationEnabled}
                    inflationRate={activeScenario.inflationRate}
                    exportMode={isExportingImage}
                  />
                </div>
                <div className={isExportingImage ? "min-w-50 flex-1" : "min-w-50"}>
                  <GroupDonutChart
                    groups={assetGroups}
                    assetClasses={activeScenario.assetClasses}
                    snapshot={selectedSnapshot}
                    inflationEnabled={activeScenario.inflationEnabled}
                    inflationRate={activeScenario.inflationRate}
                    exportMode={isExportingImage}
                  />
                </div>
                <div
                  className={
                    isExportingImage
                      ? "min-w-50 flex-2"
                      : "min-w-50 col-span-2"
                  }
                >
                  <FlowRatioChart
                    snapshot={selectedSnapshot}
                    incomes={activeScenario.incomes}
                    expenses={activeScenario.expenses}
                    categories={activeScenario.categories}
                    today={today}
                    inflationEnabled={activeScenario.inflationEnabled}
                    inflationRate={activeScenario.inflationRate}
                    exportMode={isExportingImage}
                  />
                </div>
              </div>
              {/* Mobile only — a native horizontal scroll-snap strip so the
              swipe gesture and its momentum/snap feel come from the
              browser itself, not a hand-rolled touch handler. */}
              <div className="@min-[500px]:hidden">
                <div
                  ref={carouselScrollRef}
                  onScroll={handleCarouselScroll}
                  className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
                  style={{ scrollbarWidth: "none" }}
                >
                  <div className="h-86 w-full shrink-0 snap-start overflow-y-auto px-2">
                    <ComparisonBarChart
                      snapshots={snapshots}
                      groups={assetGroups}
                      assetClasses={activeScenario.assetClasses}
                      selectedMonth={selectedMonth}
                      inflationEnabled={activeScenario.inflationEnabled}
                      inflationRate={activeScenario.inflationRate}
                      compact
                    />
                  </div>
                  <div className="h-86 w-full shrink-0 snap-start overflow-y-auto px-2">
                    <GroupDonutChart
                      groups={assetGroups}
                      assetClasses={activeScenario.assetClasses}
                      snapshot={selectedSnapshot}
                      inflationEnabled={activeScenario.inflationEnabled}
                      inflationRate={activeScenario.inflationRate}
                    />
                  </div>
                  <div className="h-86 w-full shrink-0 snap-start overflow-y-auto px-2">
                    <FlowDiagram
                      snapshot={selectedSnapshot}
                      previousSnapshot={
                        selectedMonth > 0
                          ? snapshots[selectedMonth - 1]
                          : undefined
                      }
                      primaryAsset={primaryAsset}
                      assetClasses={activeScenario.assetClasses}
                      groups={activeScenario.groups}
                      exchangeRate={activeScenario.exchangeRate}
                      inflationEnabled={activeScenario.inflationEnabled}
                      inflationRate={activeScenario.inflationRate}
                    />
                  </div>
                  <div className="h-86 w-full shrink-0 snap-start overflow-y-auto px-2">
                    <FlowRatioChart
                      snapshot={selectedSnapshot}
                      incomes={activeScenario.incomes}
                      expenses={activeScenario.expenses}
                      categories={activeScenario.categories}
                      today={today}
                      inflationEnabled={activeScenario.inflationEnabled}
                      inflationRate={activeScenario.inflationRate}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden @max-[500px]:flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  scrollToChartIndex(Math.max(0, activeChartIndex - 1))
                }
                disabled={activeChartIndex === 0}
                className="text-gray-400 disabled:opacity-30"
                aria-label="이전 차트"
              >
                ‹
              </button>
              <div className="flex gap-1.5">
                {CHART_PANEL_COUNT_ARRAY.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToChartIndex(i)}
                    aria-label={`${i + 1}번째 차트로 이동`}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === activeChartIndex ? "bg-indigo-500" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  scrollToChartIndex(
                    Math.min(
                      CHART_PANEL_COUNT_ARRAY.length - 1,
                      activeChartIndex + 1,
                    ),
                  )
                }
                disabled={
                  activeChartIndex === CHART_PANEL_COUNT_ARRAY.length - 1
                }
                className="text-gray-400 disabled:opacity-30"
                aria-label="다음 차트"
              >
                ›
              </button>
            </div>
          </div>
          <div className="@max-[1400px]:hidden">
            <HistoryPanel
              snapshots={snapshots}
              incomes={activeScenario.incomes}
              expenses={activeScenario.expenses}
              assetClasses={activeScenario.assetClasses}
              today={today}
              selectedMonth={selectedMonth}
              maxHeight={chartsColumnHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
