import { useEffect } from "react";
import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  const { locale } = useLocale();

  useEffect(() => {
    const prev = document.title;
    document.title = "Privatuma politika — jobsy.lv";
    return () => { document.title = prev; };
  }, []);

  const sections = [
    {
      title: "Kas mes esam",
      content:
        "jobsy.lv ir Latvijas tiešsaistes platforma, kas savieno cilvekus, kuri mekle palidzibu ikdienas uzdevumiem, ar cilvekiem, kuri velas piedavat savus pakalpojumus. Mes neesam darba devejs — mes tikai nodrošinam platformu, kura lietotaji var publicet sludinajumus un sazinaties.",
    },
    {
      title: "Kadus datus vacam",
      content:
        "Mes vacam tikai tos datus, kas nepieciešami pakalpojuma sniegšanai: (1) Google OAuth dati — e-pasts, vards, profila attels; (2) Sludinajuma saturs — virsraksts, apraksts, budžets, atrašanas vieta; (3) Tehniskie dati — IP adrese, parlukprogrammas tips, ierices informacija (automatiski).",
    },
    {
      title: "Kapec vacam datus",
      content:
        "Datus izmantojam, lai: (1) nodrošinatu platformas pamatfunkcionalitati; (2) noverstu krapšanu un launpratigu izmantošanu; (3) sazinatos ar lietotajiem par vinu sludinajumiem; (4) uzlabotu platformas kvalitati.",
    },
    {
      title: "Cik ilgi glabajam",
      content:
        "Sludinajumi tiek glabati 30 dienas no publicešanas briža (vai lidz dzešanai). Lietotaju kontu dati tiek glabati, kamer konts ir aktivs. Ja dzesi savu kontu, visi saistitie dati tiks dzesti 30 dienu laika.",
    },
    {
      title: "Tavas tiesibas (GDPR)",
      content:
        "Saskana ar GDPR tev ir tiesibas: (1) pieklut saviem datiem; (2) labot neprecizus datus; (3) dzest savus datus ('tiesibas tikt aizmirstam'); (4) ierobežot datu apstradi; (5) iebilst pret datu apstradi; (6) parnest datus. Lai izmantotu šis tiesibas, raksti uz info@jobsy.lv.",
    },
    {
      title: "Sikdatnes un localStorage",
      content:
        "Mes izmantojam minimalu sikdatnu skaitu: (1) Sesijas sikdatne — autentifikacijai; (2) localStorage — valodas preferences saglabašanai. Mes nesekojam lietotajiem trešo pušu sikdatnes.",
    },
    {
      title: "Kontakti",
      content:
        "Ja tev ir jautajumi par privatuma politiku vai datu apstradi, sazinies ar mums: info@jobsy.lv. Atbildesim 30 dienu laika.",
    },
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 font-body text-sm text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" />
          Atpakal
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-accent-coral" />
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
              {t(locale, "footer.privacy")}
            </h1>
            <p className="font-body text-sm text-on-surface-variant">
              Pedejo reizi atjaunots: 2025. gada 1. janvari
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="rounded-2xl border border-outline-variant bg-white p-6">
              <h2 className="mb-3 font-body text-xl font-bold text-on-surface">
                {section.title}
              </h2>
              <p className="font-body text-sm leading-relaxed text-on-surface-variant">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
