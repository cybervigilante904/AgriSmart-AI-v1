import { Crown, Mail, MessageCircle, Phone, Sprout, Sparkles } from 'lucide-react';

export function AboutView() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
      <div className="overflow-hidden rounded-3xl border border-natural-accent/20 bg-white shadow-natural">
        <div className="relative overflow-hidden bg-natural-primary px-6 py-10 text-white sm:px-10">
          <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[18px] border-natural-gold/20" />
          <div className="relative max-w-2xl">
            <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-4xl font-serif font-bold tracking-tight sm:text-5xl">
              <span>AgriSmart</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
              Practical AI-powered farming support for healthier crops, better decisions, and stronger harvests.
            </p>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="mb-3 flex items-center gap-2 text-natural-primary">
              <Sprout size={20} />
              <h3 className="text-xl font-bold">About the app</h3>
            </div>
            <p className="text-sm leading-7 text-natural-text/75">
              AgriSmart helps farmers identify crop diseases, understand soil, follow weather conditions,
              plan crop rotations, track farm records, follow market prices, and get farming advice. It is designed
              for everyday field decisions, including low-connectivity access through SMS and USSD tools.
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-natural-bg px-4 py-3 text-sm font-semibold text-natural-primary">
              <Sparkles size={17} className="text-natural-gold" />
              <span>Simple tools. Local insight. Smarter farming.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-natural-accent/20 bg-natural-cream p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-natural-accent">Created by</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <Crown size={18} className="shrink-0 text-natural-gold" aria-hidden="true" />
              <p className="glitter-name truncate text-xl font-bold">KING85</p>
              <Sparkles size={16} className="shrink-0 animate-pulse text-natural-gold" aria-hidden="true" />
            </div>
            <p className="text-sm text-natural-text/65">FOA-TECH</p>

            <div className="mt-6 border-t border-natural-accent/20 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-natural-accent">Contact us</p>
              <div className="mt-3 grid gap-2">
                <a href="mailto:mujereblessing32@gmail.com" className="flex items-center gap-2 text-sm font-semibold text-natural-primary hover:text-natural-brown">
                  <Mail size={16} />
                  <span className="break-all">mujereblessing32@gmail.com</span>
                </a>
                <a href="tel:+263779764415" className="flex items-center gap-2 text-sm font-semibold text-natural-primary hover:text-natural-brown">
                  <Phone size={16} />
                  <span>+263 77 976 4415 (calls)</span>
                </a>
                <a href="https://wa.me/263779764415" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-natural-accent/15 px-6 py-4 text-center text-xs text-natural-text/55 sm:px-10">
          Copyright © 2026 · FOA-TECH
        </footer>
      </div>
    </section>
  );
}