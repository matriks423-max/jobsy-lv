import { useEffect } from "react";
import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  const { locale } = useLocale();

  useEffect(() => {
    const prev = document.title;
    document.title = "Privātuma politika — jobsy.lv";
    return () => { document.title = prev; };
  }, []);

  const sections = [
    {
      title: "Kas mēs esam",
      content:
        "jobsy.lv ir Latvijas tiešsaistes platforma, kas savieno cilvēkus, kuri meklē palīdzību ikdienas uzdevumiem, ar cilvēkiem, kuri vēlas piedāvāt savus pakalpojumus. Mēs neesam darba devējs — mēs tikai nodrošinām platformu, kurā lietotāji var publicēt sludinājumus un sazināties.",
    },
    {
      title: "Kādus datus vācām",
      content:
        "Mēs vācam tikai tos datus, kas nepieciešami pakalpojuma sniegšanai: (1) Google OAuth dati — e-pasts, vārds, profila attēls; (2) Sludinājuma saturs — virsraksts, apraksts, budžets, atrašanās vieta; (3) Tehniskie dati — IP adrese, pārlūkprogrammas tips, ierīces informācija (automātiski).",
    },
    {
      title: "Kāpēc vācām datus",
      content:
        "Datus izmantojam, lai: (1) nodrošinātu platformas pamatfunkcionalitāti; (2) novērstu krāpšanu un ļaunprātīgu izmantošanu; (3) sazinātos ar lietotājiem par viņu sludinājumiem; (4) uzlabotu platformas kvalitāti.",
    },
    {
      title: "Cik ilgi glabājam",
      content:
        "Sludinājumi tiek glabāti 30 dienas no publicēšanas brīža (vai līdz dzēšanai). Lietotāju kontu dati tiek glabāti, kamēr konts ir aktīvs. Ja dzēsi savu kontu, visi saistītie dati tiks dzēsti 30 dienu laikā.",
    },
    {
      title: "Tavas tiesības (GDPR)",
      content:
        "Saskaņā ar GDPR tev ir tiesības: (1) piekļūt saviem datiem; (2) labot neprecīzus datus; (3) dzēst savus datus ('tiesības tikt aizmirstam'); (4) ierobežot datu apstrādi; (5) iebilst pret datu apstrādi; (6) pārnest datus. Lai izmantotu šīs tiesības, raksti uz info@jobsy.lv.",
    },
    {
      title: "Sīkdatnes un localStorage",
      content:
        "Mēs izmantojam minimālu sīkdatņu skaitu: (1) Sesijas sīkdatne — autentifikācijai; (2) localStorage — valodas preferences saglabāšanai. Mēs nesekojam lietotājiem trešo pušu sīkdatnēs.",
    },
    {
      title: "Kontakti",
      content:
        "Ja tev ir jautājumi par privātuma politiku vai datu apstrādi, sazinies ar mums: info@jobsy.lv. Atbildēsim 30 dienu laikā.",
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
          <Shield className="h-8 w-8 text-accent-coral" />
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
              {t(locale, "footer.privacy")}
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
