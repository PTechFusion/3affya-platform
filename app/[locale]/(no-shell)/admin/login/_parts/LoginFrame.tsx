// The admin sign-in frame, shared by the page and its loading state: no portal shell and no site navigation (route map), only
// the wordmark above one centred card (layout call), the language switch in its own script at the top end (rule H10), and one
// quiet line under the card for patients who land here by mistake.
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LanguageSwitch } from "@/components/brand/LanguageSwitch";
import { Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export function LoginFrame({ busy, children }: { busy?: boolean; children: React.ReactNode }) {
  const t = useTranslations("adminLogin");
  const tc = useTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end px-2 pt-2 sm:px-4 sm:pt-4">
        <LanguageSwitch />
      </div>
      <main
        aria-busy={busy || undefined}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 sm:max-w-lg sm:justify-center sm:px-0 sm:pb-24"
      >
        <div className="mb-5 flex justify-center sm:mb-6">
          <Image src="/brand/3affya_wordmark_transparent.png" alt={tc("brand")} width={1479} height={492} priority className="h-10 w-auto sm:h-12" />
        </div>
        <Surface className="sm:p-8">{children}</Surface>
        <p className="mt-6 text-center text-sm text-ink-700">
          {t.rich("patients", {
            link: (chunks) => (
              <Link href="/sign-in" className="font-semibold text-sea-700 underline underline-offset-2 hover:text-sea-800">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </main>
    </div>
  );
}
