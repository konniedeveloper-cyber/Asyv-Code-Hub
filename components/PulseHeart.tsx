"use client";

import {
  FavouriteIcon,
  StarIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import "./PulseHeart.css";

type IconName = "heart" | "star" | "thumb";
type Snapshot = { liked: boolean; count: number };
type Roll = { a: string; b: string; at: number; up: boolean };
type RollCell = { ch: string } | { top: string; bottom: string };
type PulseHeartProps = {
  liked?: boolean;
  defaultLiked?: boolean;
  count?: number;
  onChange?: (liked: boolean, count: number) => void;
  showCount?: boolean;
  icon?: IconName;
  idleOutline?: boolean;
  size?: number;
  corner?: number;
  likedColor?: string;
  idleColor?: string;
  pillColor?: string;
  textColor?: string;
  duration?: number;
  dotSize?: number;
  overshoot?: number;
  beat?: number;
  rollDuration?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
};

const OUT = 0.4;
const ICONS: Record<IconName, typeof FavouriteIcon> = {
  heart: FavouriteIcon,
  star: StarIcon,
  thumb: ThumbsUpIcon,
};

function back(k: number, c: number): number {
  const u = k - 1;
  return 1 + (c + 1) * u ** 3 + c * u ** 2;
}

function swellOf(t: number, c: number): number {
  if (t <= 0) return 0;
  if (t < OUT) return 1 - (1 - t / OUT) ** 3;
  return 1 - back((t - OUT) / (1 - OUT), c);
}

function format(count: number): string {
  return new Intl.NumberFormat().format(count);
}

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function PulseHeart({
  liked: likedProp,
  defaultLiked = false,
  count,
  onChange,
  showCount = true,
  icon = "heart",
  idleOutline = true,
  size = 40,
  corner = 32,
  likedColor = "#ff4d6d",
  idleColor = "#8b8b93",
  pillColor = "#232326",
  textColor = "#f5f5f5",
  duration = 560,
  dotSize = 0.3,
  overshoot = 1.7,
  beat = 3,
  rollDuration = 350,
  disabled = false,
  label = "Like",
  className = "",
}: PulseHeartProps): ReactNode {
  const controlled = likedProp !== undefined;
  const controlledCount = count !== undefined;
  const [inner, setInner] = useState(defaultLiked);
  const [internalCount, setInternalCount] = useState(count ?? 0);
  const total = count ?? internalCount;
  const liked = controlled ? likedProp : inner;
  const [shown, setShown] = useState<Snapshot>({ liked, count: total });
  const [roll, setRoll] = useState<Roll | null>(null);

  const rootRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const heartRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<SVGGElement>(null);
  const rollRef = useRef<HTMLSpanElement>(null);
  const raf = useRef<number>(0);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viaPointer = useRef(false);
  const shownRef = useRef(shown);
  const logical = useRef<Snapshot>({ liked, count: total });
  const cfg = useRef({ duration, dotSize, overshoot, beat, rollDuration });

  useLayoutEffect(() => {
    logical.current = { liked, count: total };
    cfg.current = { duration, dotSize, overshoot, beat, rollDuration };
  }, [liked, total, duration, dotSize, overshoot, beat, rollDuration]);

  useEffect(() => {
    if (raf.current) return;
    if (shownRef.current.liked === liked && shownRef.current.count === total) {
      return;
    }
    shownRef.current = { liked, count: total };
    setShown(shownRef.current);
  }, [liked, total]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || root.dataset.instant === undefined) return;
    root.getBoundingClientRect();
    delete root.dataset.instant;
  }, [shown]);

  useLayoutEffect(() => {
    const element = rollRef.current;
    if (!element || !roll) return;
    element.style.transition = "none";
    element.style.transform = `translateY(${roll.up ? "0" : "-1em"})`;
    element.getBoundingClientRect();
    element.style.transition = "";
    element.style.transform = `translateY(${roll.up ? "-1em" : "0"})`;
  }, [roll]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      if (rollTimer.current) clearTimeout(rollTimer.current);
    },
    []
  );

  function startRoll(from: number, to: number): void {
    if (from === to) return;
    const previous = format(from);
    const next = format(to);
    const changed =
      previous.length === next.length
        ? [...next].flatMap((character, index) =>
            character !== previous[index] ? [index] : []
          )
        : [];
    setRoll({
      a: previous,
      b: next,
      at: changed.length === 1 ? (changed[0] ?? -1) : -1,
      up: to > from,
    });
    if (rollTimer.current) clearTimeout(rollTimer.current);
    rollTimer.current = setTimeout(
      () => setRoll(null),
      cfg.current.rollDuration
    );
  }

  function run(nextLiked: boolean, nextCount: number): void {
    const root = rootRef.current;
    const heart = heartRef.current;
    const pill = pillRef.current;
    if (!root || !heart || !pill) return;
    const glyph = glyphRef.current;
    root.dataset.running = "";
    let swapped = false;
    let previousFrame = 0;
    const start = performance.now();

    const tick = (now: number): void => {
      const {
        duration: animationDuration,
        dotSize: dot,
        overshoot: curve,
        beat: pulse,
      } = cfg.current;
      const t = Math.min(1, (now - start) / animationDuration);
      const step = previousFrame ? now - previousFrame : 1000 / 60;
      previousFrame = now;
      const swell = swellOf(t, curve);
      const scale = 1 - (1 - dot) * swell;
      if (glyph) {
        glyph.setAttribute(
          "transform",
          `translate(12 12) scale(${scale}) translate(-12 -12)`
        );
      } else {
        heart.style.transform = `scale(${scale})`;
      }
      pill.style.transform = `scale(${1 - (pulse / 100) * swell})`;

      if (!swapped && t + step / 2 / animationDuration >= OUT) {
        swapped = true;
        root.dataset.liked = String(nextLiked);
        startRoll(shownRef.current.count, nextCount);
        shownRef.current = { liked: nextLiked, count: nextCount };
        setShown(shownRef.current);
      }
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
        return;
      }

      raf.current = 0;
      if (glyph) glyph.removeAttribute("transform");
      heart.style.transform = "";
      pill.style.transform = "";
      delete root.dataset.running;
      const current = logical.current;
      if (
        current.liked !== shownRef.current.liked ||
        current.count !== shownRef.current.count
      ) {
        shownRef.current = { liked: current.liked, count: current.count };
        setShown(shownRef.current);
      }
    };

    raf.current = requestAnimationFrame(tick);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    if (event.button !== 0 || disabled) return;
    viaPointer.current = true;
    if (!reducedMotion() && rootRef.current) {
      rootRef.current.dataset.pressed = "";
    }
  }

  function handlePointerUp(): void {
    if (rootRef.current) delete rootRef.current.dataset.pressed;
  }

  function handlePointerCancel(): void {
    viaPointer.current = false;
    handlePointerUp();
  }

  function handleKeyDown(_event: KeyboardEvent<HTMLButtonElement>): void {
    viaPointer.current = false;
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (disabled || raf.current) return;
    const pointer = viaPointer.current && event.detail !== 0;
    viaPointer.current = false;
    const nextLiked = !liked;
    const nextCount = total + (nextLiked ? 1 : -1);
    if (!controlled) setInner(nextLiked);
    if (!controlledCount) setInternalCount(nextCount);
    onChange?.(nextLiked, nextCount);
    if (pointer && !reducedMotion()) run(nextLiked, nextCount);
    else if (rootRef.current) rootRef.current.dataset.instant = "";
  }

  const paths = ICONS[icon];
  const text = format(shown.count);
  const cells: RollCell[] = roll
    ? roll.at === -1
      ? [{ top: roll.up ? roll.a : roll.b, bottom: roll.up ? roll.b : roll.a }]
      : [...roll.b].map((character, index): RollCell => {
          if (index !== roll.at) return { ch: character };
          const previousCharacter = roll.a[index] ?? character;
          return {
            top: roll.up ? previousCharacter : character,
            bottom: roll.up ? character : previousCharacter,
          };
        })
    : [...text].map((character) => ({ ch: character }));
  const style = {
    "--ph-size": `${size}px`,
    "--ph-corner": `${corner}px`,
    "--ph-pill": pillColor,
    "--ph-idle": idleColor,
    "--ph-liked": likedColor,
    "--ph-text": textColor,
    "--ph-roll": `${rollDuration}ms`,
    "--ph-stroke": `${(1.5 * size) / 24}px`,
  } as CSSProperties;

  return (
    <button
      ref={rootRef}
      type="button"
      aria-pressed={liked}
      disabled={disabled}
      data-liked={String(shown.liked)}
      data-solid={idleOutline ? undefined : ""}
      data-no-count={showCount ? undefined : ""}
      className={`pulse-heart${className ? ` ${className}` : ""}`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <span ref={pillRef} className="pulse-heart__pill">
        <span ref={heartRef} className="pulse-heart__heart" aria-hidden="true">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <g ref={glyphRef}>
              {paths.map(([, attributes], index) => (
                <path
                  key={String(attributes.key ?? index)}
                  d={String(attributes.d)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          </svg>
        </span>
        {showCount ? (
          <span className="pulse-heart__count" aria-hidden="true">
            {cells.map((cell, index) =>
              "ch" in cell ? (
                <span key={`c${index}`}>{cell.ch}</span>
              ) : (
                <span key={`r${index}`} className="pulse-heart__slot">
                  <span ref={rollRef} className="pulse-heart__roll">
                    <span>{cell.top}</span>
                    <span>{cell.bottom}</span>
                  </span>
                </span>
              )
            )}
          </span>
        ) : null}
        <span className="pulse-heart__sr">
          {showCount ? `${label}, ${format(total)}` : label}
        </span>
      </span>
    </button>
  );
}
