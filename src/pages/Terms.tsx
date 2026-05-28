import { useEffect } from "react";
import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  const { locale } = useLocale();

  useEffect(() => {
    const prev = document.title;
    document.title = "Lietošanas noteikumi — jobsy.lv";
    return () => { document.title = prev; };
  }, []);

  const sections = [
    {
      title: "Visparigie noteikumi",
      content:
        "Lietojot jobsy.lv, tu piekriti šiem noteikumiem. Platforma ir paredzeta personiskai, nekomercialai lietošanai. Aizliegts izmantot platformu nelikumigiem nolukiem, krapšanai vai aizskaroša satura publicešanai.",
    },
    {
      title: "Sludinajumi",
      content:
        "Katrs sludinajums ir aktivs 30 dienas no publicešanas briža. Pec tam tas automatiski beidzas. Aizliegts publicet: (1) meligu vai maldinošu informaciju; (2) aizskarošu, diskriminejošu vai nelikumigu saturu; (3) sludinajumus, kas nav saistiti ar pakalpojumu sniegšanu vai meklešanu.",
    },
    {
      title: "Maksajumi",
      content:
        "Pirmais sludinajums katram jaunam lietotajam ir bez maksas. Katrs nakamais sludinajums maksa €2.00 (divi eiro). Maksajumi tiek apstradati caur Stripe. Maksajumi nav atmaksajami, ja sludinajums jau ir publicets.",
    },
    {
      title: "Atbildiba",
      content:
        "jobsy.lv ir tiks starpniecibas platforma. Mes neesam atbildigi par darijumiem, kas notiek starp lietotajiem. Katrs lietotajs ir atbildigs par savu ricibu, darijumu drošibu un nodoklu saistibam.",
    },
    {
      title: "Kontu izbeigšana",
      content:
        "Mes paturam tiesibas dzest kontu vai bloket piekluvi, ja lietotajs parkapj šos noteikumus, publice aizskarošu saturu vai iesaistas krapšana. Konta ipašnieks var jebkura laika dzest savu kontu.",
    },
    {
      title: "Grozijumi",
      content:
        "Mes paturam tiesibas jebkura laika mainit šos noteikumus. Par butiskiem grozijumiem pazinosim e-pasta vai platforma vismaz 14 dienas pirms stašanas speka.",
    },
    {
      title: "Kontakti",
      content:
        "Jautajumu vai sudzibu gadijuma sazinies ar mums: info@jobsy.lv.",
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
          <FileText className="h-8 w-8 text-accent-coral" />
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
              {t(locale, "footer.terms")}
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
