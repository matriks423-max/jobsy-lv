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
      title: "Vispārīgie noteikumi",
      content:
        "Lietojot jobsy.lv, tu piekrīti šiem noteikumiem. Platforma ir paredzēta personiskai, nekomerciālai lietošanai. Aizliegts izmantot platformu nelikumīgiem nolūkiem, krāpšanai vai aizskaroša satura publicēšanai.",
    },
    {
      title: "Sludinājumi",
      content:
        "Katrs sludinājums ir aktīvs 30 dienas no publicēšanas brīža. Pēc tam tas automātiski beidzas. Aizliegts publicēt: (1) nepatiesas vai maldinošas informācijas; (2) aizskaroša, diskriminējoša vai nelikumīga satura; (3) sludinājumus, kas nav saistīti ar pakalpojumu sniegšanu vai meklēšanu.",
    },
    {
      title: "Maksājumi",
      content:
        "Pirmais sludinājums katram jaunam lietotājam ir bez maksas. Katrs nākamais sludinājums maksā €2.00 (divi eiro). Maksājumi tiek apstrādāti caur Stripe. Maksājumi nav atmaksājami, ja sludinājums jau ir publicēts.",
    },
    {
      title: "Atbildība",
      content:
        "jobsy.lv ir tīri starpniecības platforma. Mēs neesam atbildīgi par darījumiem, kas notiek starp lietotājiem. Katrs lietotājs ir atbildīgs par savu rīcību, darījumu drošību un nodokļu saistībām.",
    },
    {
      title: "Kontu izbeigšana",
      content:
        "Mēs paturam tiesības dzēst kontu vai bloķēt piekļuvi, ja lietotājs pārkāpj šos noteikumus, publicē aizskarošu saturu vai iesaistās krāpšanā. Konta īpašnieks var jebkurā laikā dzēst savu kontu.",
    },
    {
      title: "Grozījumi",
      content:
        "Mēs paturam tiesības jebkurā laikā mainīt šos noteikumus. Par būtiskiem grozījumiem paziņosim e-pastā vai platformā vismaz 14 dienas pirms stāšanās spēkā.",
    },
    {
      title: "Kontakti",
      content:
        "Jautājumu vai sūdzību gadījumā sazinieties ar mums: info@jobsy.lv.",
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
          Atpakaļ
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <FileText className="h-8 w-8 text-accent-coral" />
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
              {t(locale, "footer.terms")}
            </h1>
            <p className="font-body text-sm text-on-surface-variant">
              Pēdējo reizi atjaunots: 2025. gada 1. janvārī
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
