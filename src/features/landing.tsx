import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Wallet,
  CalendarDays,
  Sprout,
} from "lucide-react";
import { Brand, Preferences } from "@/components/common";
export default async function Landing() {
  const t = await getTranslations();
  return (
    <div className="landing">
      <header className="public-header">
        <Brand />
        <nav className="public-nav">
          <Preferences />
          <Link className="login-link" href="/login">
            {t("login")}
          </Link>
          <Link className="button button-dark" href="/register">
            {t("register")}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" />
              {t("heroEyebrow")}
            </p>
            <h1>{t("heroTitle")}</h1>
            <p className="hero-description">{t("heroText")}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/register">
                {t("getStarted")}
                <ArrowRight size={18} />
              </Link>
              <a className="text-link" href="#how-it-works">
                {t("howWorks")}
                <ArrowUpRight size={16} />
              </a>
            </div>
            <p className="microcopy">
              <Check size={15} />
              {t("freeStart")}
            </p>
          </div>
          <div className="hero-visual">
            <div className="example-heading">
              <span className="tiny-squares">▧</span>
              {t("example")}
            </div>
            <div className="example-budget">
              <div className="example-top">
                <span className="mini-pill">
                  <span className="live-dot" />
                  {t("today")}
                </span>
                <Sprout size={24} />
              </div>
              <p>{t("todayQuestion")}</p>
              <div className="example-amount">
                100<span>ETB</span>
              </div>
              <div className="example-rule" />
              <div className="example-days">
                <CalendarDays size={17} />
                {t("exampleDays")}
              </div>
            </div>
            <div className="example-stats">
              <div>
                <span>{t("balance")}</span>
                <strong>
                  1,500 <small>ETB</small>
                </strong>
              </div>
              <div>
                <span>{t("essentials")}</span>
                <strong>
                  400 <small>ETB</small>
                </strong>
              </div>
              <div>
                <span>{t("savings")}</span>
                <strong>
                  100 <small>ETB</small>
                </strong>
              </div>
            </div>
            <p className="example-footnote">{t("exampleNote")}</p>
            <div className="floating-note">
              <ShieldCheck size={20} />
              {t("privacyShort")}
            </div>
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <p className="eyebrow">LASTBIRR / 01</p>
            <h2>{t("builtFor")}</h2>
          </div>
          <div className="steps-grid">
            {[Wallet, ShieldCheck, Sprout].map((Icon, i) => (
              <article key={i} className="step-card">
                <div className="step-top">
                  <Icon size={25} strokeWidth={1.5} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{t(`step${i + 1}Title`)}</h3>
                <p>{t(`step${i + 1}Text`)}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="closing">
          <div>
            <p className="eyebrow">{t("tagline")}</p>
            <h2>{t("closingTitle")}</h2>
            <p>{t("closingText")}</p>
          </div>
          <Link className="button button-dark" href="/register">
            {t("register")}
            <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <p>{t("footer")}</p>
        <span>© {new Date().getFullYear()} LastBirr</span>
      </footer>
    </div>
  );
}
