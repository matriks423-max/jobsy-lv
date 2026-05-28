import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

// ─── Style A: "Craft Market" ─────────────────────────────────────────────────
// Warm terracotta editorial — think Italian market posters meets Brutalist zine.
// Bodoni Moda display + DM Mono details. Terracotta / parchment / ink.
// Grid-breaking layout, torn-edge dividers, type-as-texture.

function StyleA({ active }: { active: boolean }) {
  const cards = [
    { type: "OFFER", emoji: "🔨", title: "Santehniķis — ātra atsaukšanās", city: "Rīga", price: "€30/st", tag: "corn" },
    { type: "NEED", emoji: "🚗", title: "Nepieciešams šoferis brīvdienās", city: "Jūrmala", price: "€80", tag: "rose" },
    { type: "OFFER", emoji: "💻", title: "Tīmekļa dizains un Figma", city: "Remote", price: "€45/st", tag: "corn" },
    { type: "NEED", emoji: "🌿", title: "Meklēju dārznieku", city: "Liepāja", price: "€120", tag: "rose" },
  ];

  return (
    <div style={{
      fontFamily: "'Bodoni Moda', 'Playfair Display', Georgia, serif",
      background: "#F2EDE4",
      minHeight: "100%",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.06,
      }} />

      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1.5px solid #2A1F1A",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-1px", color: "#2A1F1A" }}>jobsy</span>
          <span style={{ fontSize: 11, fontWeight: 400, fontFamily: "'DM Mono', monospace", color: "#C4603A", letterSpacing: "0.1em" }}>.LV</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {["Sludinājumi", "Kategorijas", "Cenas"].map(l => (
            <span key={l} style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#6B4E3A", letterSpacing: "0.06em", textTransform: "uppercase" }}>{l}</span>
          ))}
          <button style={{
            background: "#C4603A", color: "#F2EDE4", border: "none",
            padding: "7px 18px", fontSize: 11, fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
          }}>Publicēt →</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "36px 24px 28px", position: "relative", zIndex: 1 }}>
        {/* Issue label */}
        <div style={{
          display: "inline-flex", gap: 8, alignItems: "center",
          border: "1px solid #2A1F1A", padding: "3px 10px", marginBottom: 16,
          fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#6B4E3A",
        }}>
          <span>Latvija</span><span style={{ color: "#C4603A" }}>●</span><span>2026 gads</span>
        </div>

        {/* Big editorial headline */}
        <h1 style={{
          fontSize: 46, fontWeight: 900, lineHeight: 0.92, letterSpacing: "-2px",
          color: "#2A1F1A", margin: "0 0 6px",
        }}>
          Atrodi<br/>
          <span style={{ color: "#C4603A", fontStyle: "italic" }}>īstu</span><br/>
          darbu.
        </h1>

        <div style={{
          marginTop: 12, marginBottom: 18, width: 48, height: 2, background: "#C4603A",
        }} />

        <p style={{
          fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#6B4E3A",
          lineHeight: 1.6, maxWidth: 260, marginBottom: 20,
          letterSpacing: "0.02em",
        }}>
          Tūkstoši darbu, pakalpojumu un piedāvājumu visā Latvijā — katru dienu.
        </p>

        <div style={{ display: "flex", gap: 0 }}>
          <input placeholder="Meklēt darbu..." style={{
            flex: 1, background: "transparent", border: "1.5px solid #2A1F1A",
            borderRight: "none", padding: "9px 14px", fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: "#2A1F1A", outline: "none",
          }} readOnly />
          <button style={{
            background: "#2A1F1A", color: "#F2EDE4", border: "1.5px solid #2A1F1A",
            padding: "9px 16px", fontFamily: "'DM Mono', monospace", fontSize: 11,
            letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
          }}>Atrast</button>
        </div>
      </div>

      {/* Divider rule */}
      <div style={{ borderTop: "1.5px solid #2A1F1A", marginBottom: 0, position: "relative", zIndex: 1 }}>
        <div style={{
          padding: "5px 24px",
          background: "#2A1F1A", color: "#F2EDE4",
          fontFamily: "'DM Mono', monospace", fontSize: 9,
          letterSpacing: "0.14em", textTransform: "uppercase",
          display: "flex", gap: 16,
        }}>
          {["Rīga", "Jūrmala", "Liepāja", "Daugavpils", "Valmiera"].map(c => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ padding: "16px 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, position: "relative", zIndex: 1 }}>
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={active ? { opacity: 0, y: 12 } : false}
            animate={active ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{
              background: card.tag === "corn" ? "#FFFBF0" : "#FFF5F0",
              border: "1.5px solid #2A1F1A", padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: card.type === "OFFER" ? "#C4603A" : "#2A1F1A",
                border: `1px solid ${card.type === "OFFER" ? "#C4603A" : "#2A1F1A"}`,
                padding: "1px 5px",
              }}>{card.type}</span>
              <span style={{ fontSize: 14 }}>{card.emoji}</span>
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#2A1F1A", lineHeight: 1.3, marginBottom: 6 }}>{card.title}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9B7A65" }}>📍 {card.city}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: "#C4603A" }}>{card.price}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer stats bar */}
      <div style={{
        borderTop: "1.5px solid #2A1F1A", padding: "10px 24px",
        display: "flex", justifyContent: "space-around", position: "relative", zIndex: 1,
      }}>
        {[["2,847", "Aktīvi"], ["18", "Kategorijas"], ["12k+", "Lietotāji"]].map(([n, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-1px", color: "#C4603A" }}>{n}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9B7A65" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Style B: "Neon District" ─────────────────────────────────────────────────
// Dark urban night market — cyberpunk meets Latvian hustle.
// Syne display + Fira Code data. Near-black background, electric lime & pink.
// Dense, data-rich, glowing cards.

function StyleB({ active }: { active: boolean }) {
  const jobs = [
    { id: "J-0041", type: "OFFER", title: "Elektriķis — sertificēts", city: "Rīga", price: "€35/st", cat: "Remontdarbi", hot: true },
    { id: "J-0042", type: "NEED", title: "Meklēju aukli 3× nedēļā", city: "Jūrmala", price: "€200/mēn", cat: "Aprūpe", hot: false },
    { id: "J-0043", type: "OFFER", title: "Fotogrāfija — portreti, pasākumi", city: "Latvia", price: "€80+", cat: "Radošais", hot: true },
    { id: "J-0044", type: "NEED", title: "React izstrādātājs, nepilna slodze", city: "Remote", price: "€45/st", cat: "IT", hot: false },
  ];

  return (
    <div style={{
      background: "#09090F",
      fontFamily: "'Syne', 'Space Grotesk', system-ui, sans-serif",
      minHeight: "100%",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(162,255,87,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(162,255,87,0.03) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Glow blob */}
      <div style={{
        position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
        width: 400, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(162,255,87,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 22px", borderBottom: "1px solid rgba(162,255,87,0.12)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#A2FF57",
            boxShadow: "0 0 8px #A2FF57",
          }} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>
            jobsy<span style={{ color: "#A2FF57" }}>.lv</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {["Browse", "Categories", "Pricing"].map(l => (
            <span key={l} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{l}</span>
          ))}
          <button style={{
            background: "transparent", color: "#A2FF57", border: "1px solid #A2FF57",
            padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            letterSpacing: "0.04em",
          }}>+ Post</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "28px 22px 20px", position: "relative", zIndex: 1 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          border: "1px solid rgba(162,255,87,0.25)", background: "rgba(162,255,87,0.06)",
          padding: "4px 12px", marginBottom: 14, borderRadius: 2,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A2FF57", display: "inline-block" }} />
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: "#A2FF57", letterSpacing: "0.08em" }}>LIVE — 47 JAUNI SLUDINĀJUMI</span>
        </div>

        <h1 style={{
          fontSize: 40, fontWeight: 900, lineHeight: 0.95,
          letterSpacing: "-2px", color: "#fff", marginBottom: 10,
        }}>
          Atrodi<br />
          <span style={{ color: "#A2FF57" }}>darbu.</span><br />
          <span style={{ color: "rgba(255,255,255,0.3)" }}>Latvijā.</span>
        </h1>

        <p style={{
          fontFamily: "'Fira Code', monospace", fontSize: 11, color: "rgba(255,255,255,0.4)",
          marginBottom: 18, lineHeight: 1.6, letterSpacing: "0.01em",
        }}>
          Darbi, pakalpojumi, sludinājumi — <span style={{ color: "#A2FF57" }}>reāli cilvēki</span>, reāls darbs.
        </p>

        <div style={{
          display: "flex", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(162,255,87,0.2)", borderRadius: 4, overflow: "hidden",
        }}>
          <input placeholder="Meklēt..." style={{
            flex: 1, background: "transparent", border: "none",
            padding: "9px 14px", fontSize: 12, color: "#fff",
            fontFamily: "'Fira Code', monospace", outline: "none",
          }} readOnly />
          <button style={{
            background: "#A2FF57", color: "#09090F", border: "none",
            padding: "9px 18px", fontSize: 12, fontWeight: 800,
            fontFamily: "'Fira Code', monospace", cursor: "pointer", letterSpacing: "0.04em",
          }}>GO</button>
        </div>
      </div>

      {/* Job cards */}
      <div style={{ padding: "0 22px 16px", display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 1 }}>
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={active ? { opacity: 0, x: -16 } : false}
            animate={active ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            style={{
              background: "rgba(255,255,255,0.025)",
              border: `1px solid ${job.hot ? "rgba(162,255,87,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 4, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 8, color: "rgba(255,255,255,0.2)", width: 44, flexShrink: 0 }}>{job.id}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: job.hot ? "#fff" : "rgba(255,255,255,0.75)", lineHeight: 1.3 }}>{job.title}</div>
              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{job.city} · {job.cat}</div>
            </div>
            {job.hot && (
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 8, color: "#A2FF57",
                border: "1px solid rgba(162,255,87,0.4)", padding: "1px 5px", letterSpacing: "0.08em",
              }}>HOT</span>
            )}
            <span style={{
              fontFamily: "'Fira Code', monospace", fontSize: 11, fontWeight: 700,
              color: job.type === "OFFER" ? "#A2FF57" : "#FF6B9D",
              minWidth: 52, textAlign: "right",
            }}>{job.price}</span>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        borderTop: "1px solid rgba(162,255,87,0.1)", padding: "10px 22px",
        display: "flex", justifyContent: "space-around", position: "relative", zIndex: 1,
      }}>
        {[["2,847", "active"], ["18", "categories"], ["12k+", "members"]].map(([n, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#A2FF57", letterSpacing: "-1px" }}>{n}</div>
            <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Style C: "Linen & Gold" ──────────────────────────────────────────────────
// Luxury editorial classified — like a high-end magazine's job section.
// Cormorant Garamond display + Outfit body. Cream / warm white / deep navy / gold.
// Generous whitespace, refined typographic hierarchy.

function StyleC({ active }: { active: boolean }) {
  const listings = [
    { num: "01", type: "Piedāvājums", title: "Santehniķis ar sertifikātu", loc: "Rīga", budget: "30€ / h", period: "2h atpakaļ" },
    { num: "02", type: "Meklē", title: "Nepieciešams tīrīšanas speciālists", loc: "Jūrmala", budget: "150€", period: "Šodien" },
    { num: "03", type: "Piedāvājums", title: "Mājas lapas dizains un izstrāde", loc: "Remote", budget: "no 400€", period: "Vakar" },
  ];

  return (
    <div style={{
      fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
      background: "#FDFBF7",
      minHeight: "100%",
      position: "relative",
    }}>
      {/* Top accent strip */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #1B2B4B, #C9A84C, #1B2B4B)" }} />

      {/* Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 28px",
        borderBottom: "1px solid #E8E2D8",
      }}>
        <div>
          <span style={{
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", color: "#1B2B4B",
          }}>
            jobsy<span style={{ color: "#C9A84C" }}>.</span>lv
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {["Sludinājumi", "Kategorijas", "Cenas"].map(l => (
            <span key={l} style={{ fontSize: 12, color: "#6B6358", fontWeight: 500 }}>{l}</span>
          ))}
          <button style={{
            background: "#1B2B4B", color: "#FDFBF7", border: "none",
            padding: "8px 20px", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.04em", cursor: "pointer",
          }}>Publicēt sludinājumu</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "36px 28px 28px" }}>
        {/* Category pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["Visi", "Remontdarbi", "IT", "Aprūpe", "Radošais"].map((c, i) => (
            <span key={c} style={{
              fontSize: 11, padding: "4px 12px",
              border: i === 0 ? "1px solid #1B2B4B" : "1px solid #D8D2C8",
              color: i === 0 ? "#FDFBF7" : "#6B6358",
              background: i === 0 ? "#1B2B4B" : "transparent",
              fontWeight: i === 0 ? 600 : 400,
              cursor: "pointer",
            }}>{c}</span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C9A84C", fontWeight: 600, marginBottom: 10 }}>
              Latvia's Local Marketplace
            </div>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
              fontSize: 48, fontWeight: 700, lineHeight: 0.95,
              letterSpacing: "-1.5px", color: "#1B2B4B", marginBottom: 14,
            }}>
              Darbs, kas<br/>
              <em style={{ color: "#C9A84C" }}>paliek</em>.
            </h1>
            <p style={{
              fontSize: 13, color: "#7A7268", lineHeight: 1.65, maxWidth: 260, marginBottom: 20,
            }}>
              Pievienojies tūkstošiem latvieša, kas katru dienu atrod labus darbus un uzticamus pakalpojumus.
            </p>

            <div style={{ display: "flex", gap: 0, maxWidth: 340 }}>
              <input placeholder="Meklēt sludinājumu..." style={{
                flex: 1, border: "1px solid #D8D2C8", borderRight: "none",
                padding: "10px 16px", fontSize: 12, color: "#1B2B4B",
                background: "#fff", outline: "none",
              }} readOnly />
              <button style={{
                background: "#C9A84C", color: "#1B2B4B", border: "1px solid #C9A84C",
                padding: "10px 20px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.04em",
              }}>Meklēt</button>
            </div>
          </div>

          {/* Sidebar stats */}
          <div style={{
            border: "1px solid #E8E2D8", padding: "16px 18px",
            background: "#fff", flexShrink: 0, minWidth: 120,
          }}>
            {[["2,847", "Aktīvi sludinājumi"], ["18", "Kategorijas"], ["12k+", "Lietotāji"]].map(([n, l]) => (
              <div key={l} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #F0EBE2" }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 24, fontWeight: 700, color: "#1B2B4B", lineHeight: 1,
                }}>{n}</div>
                <div style={{ fontSize: 9, color: "#9B9590", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div style={{ margin: "0 28px", borderTop: "1px solid #E8E2D8" }}>
        {listings.map((item, i) => (
          <motion.div
            key={item.num}
            initial={active ? { opacity: 0, y: 8 } : false}
            animate={active ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 0", borderBottom: "1px solid #F0EBE2",
            }}
          >
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 11, color: "#C9A84C", fontStyle: "italic", width: 20,
            }}>{item.num}</span>
            <span style={{
              fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
              color: item.type === "Piedāvājums" ? "#1B7A5A" : "#C4603A",
              border: `1px solid ${item.type === "Piedāvājums" ? "#1B7A5A" : "#C4603A"}`,
              padding: "1px 6px", flexShrink: 0,
            }}>{item.type}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1B2B4B" }}>{item.title}</span>
            <span style={{ fontSize: 11, color: "#9B9590" }}>📍 {item.loc}</span>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 15, fontWeight: 700, color: "#1B2B4B", minWidth: 60, textAlign: "right",
            }}>{item.budget}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Preview Page ────────────────────────────────────────────────────────

const STYLES = [
  {
    id: "a",
    label: "A — Craft Market",
    tag: "Editorial",
    tagColor: "#C4603A",
    tagBg: "#FFF0E8",
    desc: "Terracotta editorial — Italian market posters meets brutalist zine. Bodoni + DM Mono, torn-paper rules, type as texture. Warm, artisanal, unmistakably local.",
    component: StyleA,
  },
  {
    id: "b",
    label: "B — Neon District",
    tag: "Dark Urban",
    tagColor: "#A2FF57",
    tagBg: "rgba(162,255,87,0.1)",
    desc: "Dark urban night market — cyberpunk meets Latvian hustle. Syne + Fira Code, electric lime on near-black, dense data grid. Bold, fast, memorable.",
    component: StyleB,
  },
  {
    id: "c",
    label: "C — Linen & Gold",
    tag: "Luxury",
    tagColor: "#C9A84C",
    tagBg: "#FDF8EE",
    desc: "High-end classified advertising meets editorial magazine. Cormorant Garamond + Outfit, navy and gold, generous whitespace. Refined, trustworthy, premium.",
    component: StyleC,
  },
];

export default function StylePreview() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div style={{
      background: "#0A0A0A",
      minHeight: "100vh",
      padding: "48px 24px 80px",
      fontFamily: "system-ui, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;0,900;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Mono:wght@400;500&family=Fira+Code:wght@400;500;700&family=Outfit:wght@400;500;600;700&family=Syne:wght@400;700;800;900&display=swap" rel="stylesheet" />

      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 8 }}>
          jobsy.lv · Visual Redesign · 2026
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 10 }}>
          Pick your style direction
        </h1>
        <p style={{ fontSize: 13, color: "#666", maxWidth: 440, margin: "0 auto" }}>
          Three distinct aesthetics. Each is fully animated and uses real Latvian content. Click any card to select.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 1320, margin: "0 auto" }}>
        {STYLES.map(({ id, label, tag, tagColor, tagBg, desc, component: Component }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: STYLES.findIndex(s => s.id === id) * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setPicked(id)}
            style={{
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              outline: picked === id ? `2px solid ${tagColor}` : "2px solid transparent",
              outlineOffset: 3,
              boxShadow: picked === id ? `0 0 28px ${tagColor}22` : "none",
              transition: "outline 0.2s, box-shadow 0.2s",
            }}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
          >
            {/* Header bar */}
            <div style={{
              background: "#161616", padding: "12px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid #222",
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{label}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {picked === id && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{ fontSize: 12, color: tagColor }}>✓ Selected</motion.span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  color: tagColor, background: tagBg, letterSpacing: "0.06em",
                }}>{tag}</span>
              </div>
            </div>

            {/* Mockup */}
            <div style={{ height: 520, overflow: "hidden" }}>
              <Component active={true} />
            </div>

            {/* Description */}
            <div style={{ background: "#111", padding: "14px 18px", borderTop: "1px solid #1e1e1e" }}>
              <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>

            {/* CTA */}
            <div style={{ background: "#0D0D0D", padding: "0 18px 16px" }}>
              <button
                onClick={e => { e.stopPropagation(); setPicked(id); }}
                style={{
                  display: "block", width: "100%", padding: "10px",
                  background: picked === id ? tagColor : "transparent",
                  color: picked === id ? "#000" : tagColor,
                  border: `1px solid ${tagColor}`,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  letterSpacing: "0.04em", transition: "background 0.2s, color 0.2s",
                }}
              >
                {picked === id ? "✓ Izvēlēts" : `Izvēlēties ${label.split("—")[1].trim()} →`}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {picked && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginTop: 40, color: "#888", fontSize: 13 }}
        >
          Jūs izvēlējāties <strong style={{ color: "#fff" }}>{STYLES.find(s => s.id === picked)?.label}</strong>.
          Pastāstiet man, un es uzsāku pilnu dizaina pārveidi. 🚀
        </motion.div>
      )}
    </div>
  );
}
