"use client";
// Screen 31 interaction: the card shown large, the side and card-language switches, and the downloads. The card is the one
// DoctorCard in ID card mode, rendered inside its own locale provider so an Arabic page can show the English card and the
// reverse. Downloads render a hidden copy at the card's full width so every file has the same size on phone and desktop.
import { useRef, useState, type ReactNode } from "react";
import { NextIntlClientProvider, useTranslations, type AbstractIntlMessages } from "next-intl";
import { DoctorCard, type DoctorCardData, type DoctorCardState } from "@/components/brand/DoctorCard";
import { Button, SegmentedControl, Surface } from "@/components/ui";
import { dirFor } from "@/i18n/routing";
import type { Locale } from "@/lib/format";
import { canvasToPng, canvasesToPdf, faceToCanvas, saveFile } from "./card-image";

export type Side = "front" | "back";
type Job = Side | "both";
type Status = { kind: "idle" } | { kind: "working"; job: Job } | { kind: "saved"; file: string } | { kind: "error" };

type Props = {
  state: DoctorCardState;
  cards: Record<Locale, DoctorCardData>;
  /** The `card` and `common` messages per card language. */
  messages: Record<Locale, AbstractIntlMessages>;
  /** Stamp text per card language; absent once the credentials are approved. */
  watermarks?: Record<Locale, string>;
  timeZone: string;
  initialSide: Side;
  initialLang: Locale;
  /** Start of every file name, e.g. 3affya-card-dr-omar-khalil. */
  fileBase: string;
  /** Prototype switch: open with the download error showing (?state=downloadError). */
  initialError?: boolean;
  /** The verification block, rendered on the server. */
  children: ReactNode;
};

function CardInLanguage({ lang, messages, timeZone, children }: { lang: Locale; messages: AbstractIntlMessages; timeZone: string; children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={lang} messages={messages} timeZone={timeZone}>
      <div lang={lang} dir={dirFor(lang)}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

export function CardStudio({ state, cards, messages, watermarks, timeZone, initialSide, initialLang, fileBase, initialError, children }: Props) {
  const t = useTranslations("idCard");
  const tc = useTranslations("common");
  const [side, setSide] = useState<Side>(initialSide);
  const [lang, setLang] = useState<Locale>(initialLang);
  const [status, setStatus] = useState<Status>(initialError ? { kind: "error" } : { kind: "idle" });
  const stageRef = useRef<HTMLDivElement>(null);

  /** Keeps ?side= and ?lang= in the address so the view can be shared and survives a reload. */
  function remember(key: "side" | "lang", value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState(null, "", url);
  }

  async function download(job: Job) {
    const stage = stageRef.current;
    if (!stage || status.kind === "working") return;
    setStatus({ kind: "working", job });
    try {
      const face = (s: Side) => {
        const el = stage.querySelector<HTMLElement>(`[data-card-face="${s}"]`);
        if (!el) throw new Error(`no ${s} face`);
        return el;
      };
      const base = `${fileBase}-${lang}`;
      let file: string;
      if (job === "both") {
        const canvases = [await faceToCanvas(face("front")), await faceToCanvas(face("back"))];
        file = `${base}.pdf`;
        saveFile(await canvasesToPdf(canvases), file);
      } else {
        file = `${base}-${job}.png`;
        saveFile(await canvasToPng(await faceToCanvas(face(job))), file);
      }
      setStatus({ kind: "saved", file });
    } catch {
      setStatus({ kind: "error" });
    }
  }

  const working = status.kind === "working";
  const label = (job: Job, text: string, format: string) =>
    working && status.job === job ? (
      t("download.working")
    ) : (
      <>
        {text}
        <span className="ltr-run text-sm font-medium opacity-80">{format}</span>
      </>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
      {/* Above the fold on phone: the card, full width. Desktop: the card at the reading start, the controls beside it. */}
      <div className="lg:sticky lg:top-24">
        <CardInLanguage lang={lang} messages={messages[lang]} timeZone={timeZone}>
          <DoctorCard doctor={cards[lang]} state={state} side={side} idCard watermark={watermarks?.[lang]} />
        </CardInLanguage>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <SegmentedControl
            legend={t("side")}
            name="card-side"
            value={side}
            onChange={(v) => {
              setSide(v);
              remember("side", v);
            }}
            options={[
              { value: "front", label: t("sides.front") },
              { value: "back", label: t("sides.back") },
            ]}
          />
          <SegmentedControl
            legend={t("language")}
            name="card-language"
            value={lang}
            onChange={(v) => {
              setLang(v);
              remember("lang", v);
            }}
            options={[
              { value: "ar", label: tc("arabic"), lang: "ar" },
              { value: "en", label: tc("english"), lang: "en" },
            ]}
          />
        </div>

        <section aria-labelledby="card-download-title">
          <Surface>
            <h2 id="card-download-title" className="text-xl font-bold text-sea-900">
              {t("download.title")}
            </h2>
            <p className="mt-1 text-sm text-ink-700">{t("download.hint")}</p>
            {/* Two columns where the box has the full width; one beside the card on desktop, where Arabic labels would wrap. */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Button onClick={() => download("front")} disabled={working} aria-busy={working && status.job === "front"}>
                {label("front", t("download.front"), "PNG")}
              </Button>
              <Button variant="secondary" onClick={() => download("back")} disabled={working} aria-busy={working && status.job === "back"}>
                {label("back", t("download.back"), "PNG")}
              </Button>
              <Button variant="ghost" className="sm:col-span-2 lg:col-span-1" onClick={() => download("both")} disabled={working} aria-busy={working && status.job === "both"}>
                {label("both", t("download.both"), "PDF")}
              </Button>
            </div>
            <div aria-live="polite" className="text-sm">
              {status.kind === "saved" ? (
                <p className="mt-3 text-success">
                  {t("download.saved")} <span className="ltr-run">{status.file}</span>
                </p>
              ) : status.kind === "error" ? (
                <p className="mt-3 text-danger">{t("download.error")}</p>
              ) : null}
            </div>
          </Surface>
        </section>

        {children}
      </div>

      {/* The copy the downloads are drawn from: always the card's full width (448 px), out of sight and out of the reading
          and tab order. Rendered with side="front" because both faces are in the DOM either way. */}
      <div aria-hidden="true" inert className="pointer-events-none fixed start-0 top-0 size-0 overflow-hidden">
        <div ref={stageRef} className="w-md">
          <CardInLanguage lang={lang} messages={messages[lang]} timeZone={timeZone}>
            <DoctorCard doctor={cards[lang]} state={state} side="front" idCard watermark={watermarks?.[lang]} />
          </CardInLanguage>
        </div>
      </div>
    </div>
  );
}
