"use client";

import { AlertTriangle, Download, FlaskConical, Loader2, Play, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IntervalPlot } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toCsv } from "@/lib/csv";
import { downloadText } from "@/lib/download";
import {
  CONTROL_WINDOW_MINUTES,
  DEFAULT_DESIGN,
  designErrors,
  designWarnings,
  planMeanSampleSize,
  planSampleSize,
  PRIMARY_METRICS,
  type DesignField,
  type ExperimentDesign,
  type PrimaryMetric,
} from "@/lib/experiments/design";
import { PEEKING_MAX_PER_ARM, type PeekingResult } from "@/lib/experiments/peeking";
import {
  DEFAULT_PEEK_RUN,
  DEFAULT_SIM_RUN,
  handleWorkerRequest,
  PEEKING_ALPHA,
  PEEKING_REPS,
  PEEKING_SEED,
  peekingPerArm,
  PERMUTATION_REPS,
  SIM_MAX_PER_ARM,
  type PeekRun,
  type SimRun,
  type WorkerRequest,
  type WorkerResponse,
} from "@/lib/experiments/runs";
import { analysisRows, levelLabel, type ExperimentAnalysis } from "@/lib/experiments/simulate";
import {
  formatNumber,
  formatP,
  formatPct,
  formatPctInterval,
  formatSigned,
} from "@/lib/stats/format";
import type { ProportionCI } from "@/lib/stats/proportion";
import { cn } from "@/lib/utils";

export type DesignerFacts = {
  /** Share of non-cancelled orders rated 4+, unrated counting as "no" (the metric's denominator). */
  ratingFourPlus: ProportionCI;
  ratedOrders: number;
  ratingMean: number;
  ratingSd: number;
  fulfilmentPool: number[];
  customers: number;
  orders: number;
};

const ALPHAS = [0.01, 0.05, 0.1] as const;
const POWERS = [0.8, 0.9] as const;
const LOOKS = [2, 3, 5, 10] as const;

const round2 = (x: number) => Math.round(x * 100) / 100;

type WorkerJob = WorkerRequest extends infer R
  ? R extends WorkerRequest
    ? Omit<R, "id">
    : never
  : never;

/**
 * Runs the simulations in a Web Worker so a large run never freezes the
 * page. Falls back to the main thread (after a paint) where Workers are
 * unavailable or the worker fails to load.
 */
function useExperimentWorker() {
  const worker = useRef<Worker | null | undefined>(undefined);
  const pending = useRef(
    new Map<number, { req: WorkerRequest; resolve: (r: WorkerResponse) => void }>(),
  );
  const nextId = useRef(1);
  useEffect(() => () => worker.current?.terminate(), []);

  return useCallback((job: WorkerJob): Promise<WorkerResponse> => {
    const req = { ...job, id: nextId.current++ } as WorkerRequest;
    const onMainThread = () =>
      new Promise<WorkerResponse>((resolve) =>
        setTimeout(() => resolve(handleWorkerRequest(req)), 0),
      );
    if (worker.current === undefined) {
      try {
        const w = new Worker(new URL("./experiment.worker.ts", import.meta.url), {
          type: "module",
        });
        w.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const entry = pending.current.get(event.data.id);
          pending.current.delete(event.data.id);
          entry?.resolve(event.data);
        };
        w.onerror = () => {
          // The worker could not load or crashed: finish its jobs here instead.
          w.terminate();
          worker.current = null;
          for (const [id, entry] of pending.current) {
            pending.current.delete(id);
            setTimeout(() => entry.resolve(handleWorkerRequest(entry.req)), 0);
          }
        };
        worker.current = w;
      } catch {
        worker.current = null;
      }
    }
    const w = worker.current;
    if (!w) return onMainThread();
    return new Promise<WorkerResponse>((resolve) => {
      pending.current.set(req.id, { req, resolve });
      w.postMessage(req);
    });
  }, []);
}

function Field({
  id,
  label,
  hint,
  error,
  children,
  group = false,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  /** Shown under the input (give the input aria-invalid and aria-describedby={`${id}-error`}). */
  error?: string;
  children: ReactNode;
  /** The control is a group of buttons: name it with aria-labelledby, not a <label>. */
  group?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      {group ? (
        <span
          id={`${id}-label`}
          className="block text-xs leading-none font-semibold text-muted-foreground"
        >
          {label}
        </span>
      ) : (
        <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-[0.7rem] leading-snug font-medium text-tomato-700 dark:text-tomato-300"
        >
          {error}
        </p>
      ) : null}
      {hint ? <p className="text-[0.7rem] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format = String,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"

          aria-pressed={o === value}
          onClick={() => onChange(o)}
          className={cn(
            "tabular rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            o === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/60 px-3 py-2.5">
      <dt className="text-[0.7rem] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-semibold">{value}</dd>
      {note ? <dd className="text-[0.7rem] leading-snug text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

function Step({
  n,
  id,
  title,
  children,
}: {
  n: number;
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
    >
      <h2 id={id} className="mb-4 flex items-center gap-2.5 text-xl font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ExperimentDesigner({
  facts,
  initialSim,
  initialPeek,
}: {
  facts: DesignerFacts;
  /** The default simulation (DEFAULT_SIM_RUN), computed on the server so the page loads without it. */
  initialSim: ExperimentAnalysis;
  /** The default peeking simulation (DEFAULT_PEEK_RUN), computed on the server. */
  initialPeek: PeekingResult;
}) {
  const [design, setDesign] = useState<ExperimentDesign>(DEFAULT_DESIGN);
  const [meanMde, setMeanMde] = useState(0.2);
  const set = <K extends keyof ExperimentDesign>(key: K, value: ExperimentDesign[K]) =>
    setDesign((d) => ({ ...d, [key]: value }));

  const errors = designErrors(design);
  const errorFor = (field: DesignField) => errors.find((e) => e.field === field)?.message;
  const invalid = (field: DesignField) =>
    errorFor(field) ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` } : {};
  const warnings = designWarnings(design);
  const plan = useMemo(() => planSampleSize(design), [design]);
  const meanPlan = useMemo(() => {
    try {
      return planMeanSampleSize({
        mde: meanMde,
        sd: facts.ratingSd,
        alpha: design.alpha,
        power: design.power,
      });
    } catch {
      return null;
    }
  }, [meanMde, facts.ratingSd, design.alpha, design.power]);

  // The secondary metric only counts customers who rate; scale its n up by 1 / (share who rate).
  const shareWhoRate = facts.ratingFourPlus.n ? facts.ratedOrders / facts.ratingFourPlus.n : NaN;

  const chooseMetric = (metric: PrimaryMetric) => {
    setDesign((d) => ({
      ...d,
      metric,
      baseline:
        metric === "rating-4plus" ? round2(facts.ratingFourPlus.p) : DEFAULT_DESIGN.baseline,
      mde: metric === "rating-4plus" ? 0.06 : DEFAULT_DESIGN.mde,
    }));
  };

  // --- Simulation: inputs are drafts until "Run" commits them. ------------
  // Results run in a Web Worker; the defaults arrive pre-computed from the server.
  const compute = useExperimentWorker();
  const [simDraft, setSimDraft] = useState({
    effect: 8,
    perArm: "",
    seed: String(DEFAULT_SIM_RUN.seed),
  });
  const [simState, setSimState] = useState<{ run: SimRun; analysis: ExperimentAnalysis }>({
    run: DEFAULT_SIM_RUN,
    analysis: initialSim,
  });
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const latestSim = useRef(0);
  const simRun = simState.run;
  const sim = simState.analysis;

  const runSimulation = async () => {
    if (!plan) return;
    const perArm = Math.min(
      SIM_MAX_PER_ARM,
      Math.max(10, Math.round(Number(simDraft.perArm) || plan.perArm)),
    );
    const seed = Number.parseInt(simDraft.seed, 10);
    const effect = simDraft.effect / 100;
    if (!Number.isFinite(seed) || !Number.isFinite(effect)) {
      setSimError("Enter an injected effect and a whole-number seed.");
      return;
    }
    if (design.baseline + effect < 0 || design.baseline + effect > 1) {
      setSimError("Baseline plus the injected effect must stay between 0% and 100%.");
      return;
    }
    const run: SimRun = { design, effect, perArm, seed };
    const ticket = ++latestSim.current;
    setSimError(null);
    setSimBusy(true);
    const res = await compute({ kind: "sim", run, pool: facts.fulfilmentPool });
    if (ticket !== latestSim.current) return;
    setSimBusy(false);
    if (res.ok && res.kind === "sim") setSimState({ run, analysis: res.result });
    else setSimError(res.ok ? "Unexpected result." : res.message);
  };

  // --- Peeking ---------------------------------------------------------------
  const [looks, setLooks] = useState<(typeof LOOKS)[number]>(10);
  const [peekState, setPeekState] = useState<{ run: PeekRun; result: PeekingResult }>({
    run: DEFAULT_PEEK_RUN,
    result: initialPeek,
  });
  const [peekBusy, setPeekBusy] = useState(false);
  const latestPeek = useRef(0);
  const peekRun = peekState.run;
  const peek = peekState.result;
  const peekCapped = peekRun.perArm > PEEKING_MAX_PER_ARM;

  const runPeeking = async () => {
    if (!plan) return;
    const run: PeekRun = { looks, perArm: plan.perArm, baseline: design.baseline };
    const ticket = ++latestPeek.current;
    setPeekBusy(true);
    const res = await compute({ kind: "peek", run });
    if (ticket !== latestPeek.current) return;
    setPeekBusy(false);
    if (res.ok && res.kind === "peek") setPeekState({ run, result: res.result });
  };

  const metric = PRIMARY_METRICS[simRun.design.metric];
  const alpha = simRun.design.alpha;
  const ci = levelLabel(sim.level);
  const missOneIn = Math.round(1 / alpha);
  const significant = sim.zTest.p < alpha;
  const exportBase = `snacks-experiment-seed${simRun.seed}`;
  const exportPayload = () => ({
    exportedAt: new Date().toISOString(),
    note: "Simulated experiment on synthetic customers with a known injected effect. Not real data.",
    design: simRun.design,
    simulation: {
      perArm: simRun.perArm,
      injectedEffect: simRun.effect,
      seed: simRun.seed,
      permutationReps: PERMUTATION_REPS,
      intervalLevel: sim.level,
      // Everything needed to rerun it: the seed alone is not enough without the pool.
      fulfilmentPool: facts.fulfilmentPool,
    },
    results: analysisRows(sim),
  });

  return (
    <div className="space-y-6">
      <Step n={1} id="design" title="Design the test">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <Field id="hypothesis" label="Hypothesis (written before any data is seen)">
              <Textarea
                id="hypothesis"
                value={design.hypothesis}
                onChange={(e) => set("hypothesis", e.target.value)}
                rows={3}
                maxLength={400}
              />
            </Field>
            <div className="rounded-xl border border-dashed p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Users className="size-4 text-primary" aria-hidden /> Randomisation unit: the
                customer
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Each customer is assigned once, by a seeded coin, and keeps the same rule for every
                order. Randomising orders instead would let one person see both rules, and repeat
                orders from the same person are not independent, so a per-order analysis would
                overstate the evidence.
              </p>
            </div>
            <Field id="metric" label="Primary metric (one, chosen in advance)" group>
              <div
                id="metric"
                role="group"
                aria-label="Primary metric"
                className="grid gap-2 sm:grid-cols-2"
              >
                {(Object.keys(PRIMARY_METRICS) as PrimaryMetric[]).map((key) => (
                  <button
                    key={key}
                    type="button"

                    aria-pressed={design.metric === key}
                    onClick={() => chooseMetric(key)}
                    className={cn(
                      "rounded-xl border p-3 text-left text-sm transition-colors",
                      design.metric === key
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <span className="block font-semibold">{PRIMARY_METRICS[key].label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {PRIMARY_METRICS[key].description}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field
                id="baseline"
                label="Baseline rate (%)"
                error={errorFor("baseline")}
                hint={
                  design.metric === "rating-4plus" ? (
                    <>
                      Observed: {formatPct(facts.ratingFourPlus.p, 0)}{" "}
                      {formatPctInterval(facts.ratingFourPlus.lower, facts.ratingFourPlus.upper, 0)}
                      : {facts.ratingFourPlus.successes} of {facts.ratingFourPlus.n} non-cancelled
                      demo orders rated 4 or 5 stars, unrated counting as no (per order, synthetic).
                    </>
                  ) : (
                    <>
                      An assumption: {facts.customers} synthetic customers are too few to estimate
                      it.
                    </>
                  )
                }
              >
                <Input
                  id="baseline"
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={Math.round(design.baseline * 100)}
                  onChange={(e) => set("baseline", Number(e.target.value) / 100)}
                  {...invalid("baseline")}
                />
              </Field>
              <Field
                id="mde"
                label="Min. detectable effect (points)"
                hint="Smallest change worth acting on."
                error={errorFor("mde")}
              >
                <Input
                  id="mde"
                  type="number"
                  min={-50}
                  max={50}
                  step={1}
                  value={Math.round(design.mde * 100)}
                  onChange={(e) => set("mde", Number(e.target.value) / 100)}
                  {...invalid("mde")}
                />
              </Field>
              <Field
                id="window"
                label="Treatment window (min)"
                hint={`Control keeps the ${CONTROL_WINDOW_MINUTES}-minute rule.`}
                error={errorFor("window")}
              >
                <Input
                  id="window"
                  type="number"
                  min={5}
                  max={20}
                  step={1}
                  value={design.treatmentWindow}
                  onChange={(e) => set("treatmentWindow", Number(e.target.value))}
                  {...invalid("window")}
                />
              </Field>
              <Field id="alpha" label="Significance level α (two-sided)" group>
                <Segmented
                  label="Significance level"
                  value={design.alpha as (typeof ALPHAS)[number]}
                  options={ALPHAS}
                  onChange={(v) => set("alpha", v)}
                />
              </Field>
              <Field id="power" label="Power (1 − β)" group>
                <Segmented
                  label="Power"
                  value={design.power as (typeof POWERS)[number]}
                  options={POWERS}
                  onChange={(v) => set("power", v)}
                />
              </Field>
              <Field
                id="per-day"
                label="New customers per day"
                hint="To turn a sample size into a duration."
                error={errorFor("per-day")}
              >
                <Input
                  id="per-day"
                  type="number"
                  min={1}
                  max={10000}
                  value={design.customersPerDay}
                  onChange={(e) => set("customersPerDay", Number(e.target.value))}
                  {...invalid("per-day")}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Required sample size
              </p>
              {plan ? (
                <>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <Stat label="Customers per arm" value={plan.perArm.toLocaleString("en-AU")} />
                    <Stat label="Total customers" value={plan.total.toLocaleString("en-AU")} />
                    <Stat
                      label="Duration"
                      value={`${plan.days} days`}
                      note={`at ${design.customersPerDay} new customers a day, enrolment only`}
                    />
                    <Stat
                      label="Arcsine cross-check"
                      value={plan.perArmArcsine.toLocaleString("en-AU")}
                      note="per arm, Cohen's h formula"
                    />
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Pooled two-proportion z-test, two-sided α = {design.alpha}, power{" "}
                    {formatPct(design.power, 0)}, 1:1 allocation, to detect{" "}
                    {formatPct(design.baseline, 0)} → {formatPct(plan.treatmentRate, 0)}. Formula: n
                    = ((z<sub>1−α/2</sub>σ<sub>0</sub> + z<sub>power</sub>σ<sub>1</sub>)/δ)², with σ
                    <sub>0</sub> from the pooled rate under H<sub>0</sub>; it matches statsmodels to
                    the decimal (see the tests).
                  </p>
                </>
              ) : (
                <div className="mt-3 space-y-1.5 text-sm" role="status">
                  <p className="font-medium">Fix the highlighted inputs to get a sample size:</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-tomato-700 dark:text-tomato-300">
                    {errors.map((e) => (
                      <li key={e.field + e.message}>{e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {warnings.length ? (
              <ul className="space-y-1.5 rounded-xl border border-honey-400/60 bg-honey-300/20 p-3 text-xs text-espresso-800 dark:text-honey-300">
                {warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {w}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Secondary metric: mean rating (two-mean formula)
              </p>
              <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                <Field
                  id="mean-mde"
                  label="Difference in mean stars to detect"
                  hint={
                    <>
                      SD {formatNumber(facts.ratingSd, 2)} stars from {facts.ratedOrders} demo
                      ratings (mean {formatNumber(facts.ratingMean, 2)}).
                    </>
                  }
                >
                  <Input
                    id="mean-mde"
                    type="number"
                    min={0.05}
                    max={2}
                    step={0.05}
                    value={meanMde}
                    onChange={(e) => setMeanMde(Number(e.target.value))}
                  />
                </Field>
              </div>
              {meanPlan ? (
                <p className="mt-3 text-sm">
                  d = {formatNumber(meanPlan.d, 2)}:{" "}
                  <strong className="tabular">{meanPlan.perArmZ.toLocaleString("en-AU")}</strong>{" "}
                  per arm (z-test),{" "}
                  <strong className="tabular">{meanPlan.perArmT.toLocaleString("en-AU")}</strong>{" "}
                  with the t-test correction. Only customers who rate count here, so the real
                  requirement is larger by 1 / (share who rate)
                  {Number.isFinite(shareWhoRate) && shareWhoRate > 0 ? (
                    <>
                      : at the demo&apos;s {formatPct(shareWhoRate, 0)} ({facts.ratedOrders} of{" "}
                      {facts.ratingFourPlus.n} orders rated), about{" "}
                      <strong className="tabular">
                        {Math.ceil(meanPlan.perArmT / shareWhoRate).toLocaleString("en-AU")}
                      </strong>{" "}
                      customers per arm would need to be randomised.
                    </>
                  ) : (
                    "."
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Step>

      <Step n={2} id="simulate" title="Simulate it on synthetic customers">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A dry run of the analysis plan on seeded synthetic customers, with a{" "}
          <strong className="text-foreground">known effect injected</strong> into the treatment arm.
          Minutes-to-ready are resampled from the {facts.fulfilmentPool.length} served orders in the
          demo data, the same in both arms; each arm&apos;s window decides who gets the discount.
          Because the truth is known, you can see whether the analysis finds it, and how often it
          would not.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field id="effect" label="Injected true effect (points)">
            <Input
              id="effect"
              type="number"
              className="w-28"
              step={1}
              min={-50}
              max={50}
              value={simDraft.effect}
              onChange={(e) => setSimDraft((s) => ({ ...s, effect: Number(e.target.value) }))}
            />
          </Field>
          <Field id="sim-n" label="Customers per arm">
            <Input
              id="sim-n"
              type="number"
              className="w-32"
              min={10}
              max={20000}
              placeholder={plan ? String(plan.perArm) : ""}
              value={simDraft.perArm}
              onChange={(e) => setSimDraft((s) => ({ ...s, perArm: e.target.value }))}
            />
          </Field>
          <Field id="seed" label="Seed">
            <Input
              id="seed"
              type="number"
              className="w-28"
              value={simDraft.seed}
              onChange={(e) => setSimDraft((s) => ({ ...s, seed: e.target.value }))}
            />
          </Field>
          <Button
            type="button"
            className="h-9 rounded-xl"
            onClick={runSimulation}
            disabled={simBusy || !plan}
          >
            {simBusy ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />} Run
            simulation
          </Button>
        </div>
        {!plan ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Fix the design in step 1 to run a simulation.
          </p>
        ) : null}
        {simError ? (
          <p role="alert" className="mt-2 text-xs font-medium text-tomato-700 dark:text-tomato-300">
            {simError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_1fr]" aria-live="polite">
          <div className="min-w-0 space-y-4">
            <p id="sim-caption" className="text-xs text-muted-foreground">
              {metric.label}, by arm. Seed {simRun.seed}, injected effect{" "}
              {formatSigned(simRun.effect * 100, 0)} points, {simRun.perArm.toLocaleString("en-AU")}{" "}
              customers per arm, α = {alpha} so every interval is a {ci} interval.
            </p>
            <div
              className="overflow-x-auto rounded-xl border"
              tabIndex={0}
              role="region"
              aria-labelledby="sim-caption"
            >
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="px-3 py-2 font-medium">
                      Arm
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      n
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Yes
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Rate [{ci} CI, Wilson]
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Discounted first orders
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {(
                    [
                      ["Control", `${CONTROL_WINDOW_MINUTES}-min rule`, sim.control, "bg-viz-b"],
                      [
                        "Treatment",
                        `${simRun.design.treatmentWindow}-min rule`,
                        sim.treatment,
                        "bg-viz-a",
                      ],
                    ] as const
                  ).map(([name, rule, arm, swatch]) => (
                    <tr key={name} className="border-b last:border-0">
                      <th scope="row" className="px-3 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          <span className={cn("size-2.5 rounded-full", swatch)} aria-hidden />
                          {name}
                          <span className="text-xs font-normal text-muted-foreground">{rule}</span>
                        </span>
                      </th>
                      <td className="px-3 py-2">{arm.n}</td>
                      <td className="px-3 py-2">{arm.outcome.successes}</td>
                      <td className="px-3 py-2">
                        {formatPct(arm.outcome.p, 1)}{" "}
                        {formatPctInterval(arm.outcome.lower, arm.outcome.upper, 1)}
                      </td>
                      <td className="px-3 py-2">
                        {formatPct(arm.discounted.p, 0)}{" "}
                        {formatPctInterval(arm.discounted.lower, arm.discounted.upper, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <IntervalPlot
              label={`Difference in ${metric.short}, treatment minus control, with ${ci} Newcombe interval; zero and the injected effect marked.`}
              domain={[
                Math.min(-0.05, sim.difference.lower - 0.03, simRun.effect - 0.03),
                Math.max(0.05, sim.difference.upper + 0.03, simRun.effect + 0.03),
              ]}
              format={(v) => `${formatSigned(v * 100, 0)}`}
              axisLabel="Percentage points"
              references={[
                { value: 0, label: "no difference", dashed: false },
                {
                  value: simRun.effect,
                  label: `injected effect ${formatSigned(simRun.effect * 100, 0)}`,
                },
              ]}
              rows={[
                {
                  key: "primary",
                  label: <span>Primary: {metric.short}</span>,
                  estimate: sim.difference.estimate,
                  lower: sim.difference.lower,
                  upper: sim.difference.upper,
                  emphasis: true,
                  value: (
                    <>
                      {formatSigned(sim.difference.estimate * 100, 1)} pts [
                      {formatSigned(sim.difference.lower * 100, 1)},{" "}
                      {formatSigned(sim.difference.upper * 100, 1)}]
                    </>
                  ),
                },
              ]}
            />
            <IntervalPlot
              label={`Guardrail: change in the share of first orders discounted, treatment minus control, with ${ci} Newcombe interval.`}
              domain={[
                Math.min(-0.05, sim.discountDifference.lower - 0.05),
                Math.max(0.05, sim.discountDifference.upper + 0.05),
              ]}
              format={(v) => `${formatSigned(v * 100, 0)}`}
              axisLabel="Percentage points"
              references={[{ value: 0, label: "no difference", dashed: false }]}
              rows={[
                {
                  key: "guardrail",
                  label: "Guardrail: first orders discounted",
                  estimate: sim.discountDifference.estimate,
                  lower: sim.discountDifference.lower,
                  upper: sim.discountDifference.upper,
                  value: (
                    <>
                      {formatSigned(sim.discountDifference.estimate * 100, 1)} pts [
                      {formatSigned(sim.discountDifference.lower * 100, 1)},{" "}
                      {formatSigned(sim.discountDifference.upper * 100, 1)}]
                    </>
                  ),
                },
              ]}
            />
          </div>

          <div className="min-w-0 space-y-4">
            <dl className="grid grid-cols-2 gap-2">
              <Stat
                label={`Difference (Newcombe ${ci} CI)`}
                value={`${formatSigned(sim.difference.estimate * 100, 1)} pts`}
                note={`[${formatSigned(sim.difference.lower * 100, 1)}, ${formatSigned(sim.difference.upper * 100, 1)}]`}
              />
              <Stat
                label="Effect size"
                value={`h = ${formatNumber(sim.cohensH, 2)}`}
                note={`relative lift ${formatSigned(sim.relativeLift * 100, 0)}%`}
              />
              <Stat
                label="z-test (pooled)"
                value={`p = ${formatP(sim.zTest.p)}`}
                note={`z = ${formatNumber(sim.zTest.z, 2)}`}
              />
              <Stat
                label="Permutation test"
                value={`p = ${formatP(sim.permutation.p)}`}
                note={`${PERMUTATION_REPS.toLocaleString("en-AU")} relabellings, seed ${simRun.seed}; exact p = ${formatP(sim.exact.p)}`}
              />
            </dl>
            <div
              className={cn(
                "rounded-xl border p-3 text-sm leading-relaxed",
                sim.coversTruth
                  ? "border-matcha-500/40 bg-matcha-500/10"
                  : "border-tomato-500/40 bg-tomato-500/10",
              )}
            >
              <p className="font-semibold">Reading this run</p>
              <p className="mt-1 text-muted-foreground">
                {significant
                  ? `At α = ${alpha} the difference is statistically significant`
                  : `At α = ${alpha} the test does not reject "no difference"`}
                ; the {ci} interval {sim.coversTruth ? "covers" : "misses"} the injected{" "}
                {formatSigned(simRun.effect * 100, 0)} points.{" "}
                {sim.coversTruth
                  ? `About 1 run in ${missOneIn} will miss it by design; change the seed to see the spread.`
                  : `That happens in about 1 run in ${missOneIn}; this is one of them.`}{" "}
                The guardrail shows the cost side: the share of first orders discounted changes by{" "}
                {formatSigned(sim.discountDifference.estimate * 100, 0)} points (treatment minus
                control).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={() =>
                  downloadText(
                    `${exportBase}.json`,
                    `${JSON.stringify(exportPayload(), null, 2)}\n`,
                    "application/json",
                  )
                }
              >
                <Download aria-hidden /> Results JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={() => {
                  const rows = analysisRows(sim);
                  downloadText(`${exportBase}.csv`, toCsv(Object.keys(rows[0]), rows), "text/csv");
                }}
              >
                <Download aria-hidden /> Results CSV
              </Button>
            </div>
          </div>
        </div>
      </Step>

      <Step n={3} id="peeking" title="Don't peek: why the sample size is fixed in advance">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="flex gap-2 rounded-xl border border-tomato-500/40 bg-tomato-500/10 p-3">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-tomato-600 dark:text-tomato-300"
                aria-hidden
              />
              <span>
                Checking the p-value as data arrives and stopping at the first p &lt; 0.05 is not a
                5% test. Each look is another chance for noise to cross the line, so the
                false-positive rate grows with the number of looks.
              </span>
            </p>
            <p className="text-muted-foreground">
              The panel runs {PEEKING_REPS.toLocaleString("en-AU")} A/A experiments (both arms get
              the same rule, so every &quot;win&quot; is false) at the planned sample size (capped
              at {PEEKING_MAX_PER_ARM.toLocaleString("en-AU")} per arm), each analysed at equally
              spaced looks at α = {PEEKING_ALPHA}. Seed {PEEKING_SEED}.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Fix the sample size and the analysis before the start (step 1), and look once.
              </li>
              <li>
                If interim looks are needed, plan them: a group-sequential boundary (Pocock or
                O&apos;Brien–Fleming) or an alpha-spending function keeps the overall error at α.
              </li>
              <li>
                Or use always-valid inference (e.g. mixture SPRT), built to be monitored
                continuously.
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Interim looks</span>
                <Segmented
                  label="Interim looks"
                  value={looks}
                  options={LOOKS}
                  onChange={setLooks}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-xl"
                disabled={peekBusy || !plan}
                onClick={runPeeking}
              >
                {peekBusy ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <FlaskConical aria-hidden />
                )}
                Run {PEEKING_REPS.toLocaleString("en-AU")} A/A tests
              </Button>
            </div>
            <IntervalPlot
              label={`False-positive rates over ${peek.reps.toLocaleString("en-AU")} A/A experiments with ${peek.looks} looks: fixed horizon ${formatPct(peek.fixedHorizon.p, 1)}, naive peeking ${formatPct(peek.peeking.p, 1)}${peek.pocock ? `, Pocock boundary ${formatPct(peek.pocock.p, 1)}` : ""}.`}
              domain={[0, Math.max(0.3, peek.peeking.upper + 0.02)]}
              format={(v) => formatPct(v, 0)}
              axisLabel={`${peek.looks} looks, ${peekingPerArm(peekRun).toLocaleString("en-AU")} customers per arm at the end${peekCapped ? ` (capped from the planned ${peekRun.perArm.toLocaleString("en-AU")} to keep the page responsive; the inflation depends on the number of looks, not on n)` : ""}, baseline ${formatPct(peekRun.baseline, 0)}`}
              references={[{ value: 0.05, label: "nominal α = 5%" }]}
              rows={[
                {
                  key: "fixed",
                  label: "Look once at the end",
                  series: "b",
                  estimate: peek.fixedHorizon.p,
                  lower: peek.fixedHorizon.lower,
                  upper: peek.fixedHorizon.upper,
                  value: `${formatPct(peek.fixedHorizon.p, 1)} ${formatPctInterval(peek.fixedHorizon.lower, peek.fixedHorizon.upper, 1)}`,
                },
                {
                  key: "peek",
                  label: "Stop at first p < 0.05",
                  emphasis: true,
                  estimate: peek.peeking.p,
                  lower: peek.peeking.lower,
                  upper: peek.peeking.upper,
                  value: `${formatPct(peek.peeking.p, 1)} ${formatPctInterval(peek.peeking.lower, peek.peeking.upper, 1)}`,
                },
                ...(peek.pocock
                  ? [
                      {
                        key: "pocock",
                        label: `Pocock boundary (|z| > ${peek.pocockZ})`,
                        series: "b" as const,
                        estimate: peek.pocock.p,
                        lower: peek.pocock.lower,
                        upper: peek.pocock.upper,
                        value: `${formatPct(peek.pocock.p, 1)} ${formatPctInterval(peek.pocock.lower, peek.pocock.upper, 1)}`,
                      },
                    ]
                  : []),
              ]}
            />
            <p className="text-xs text-muted-foreground">
              False-positive rate with Wilson 95% intervals (simulation error). The Pocock constant
              for {peek.looks} equally spaced looks at two-sided α = 0.05 is from Jennison &amp;
              Turnbull (2000), Table 2.1.
            </p>
          </div>
        </div>
      </Step>
    </div>
  );
}
