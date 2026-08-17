'use client';

import React from 'react';
import { asset } from '@/lib/basePath';
import MaskIcon from '@/components/MaskIcon';

export default function OaiFooter() {
  // Subscribe form temporarily disabled — see the commented-out <section> below.
  // Restore this state + handler when re-enabling.
  // const [email, setEmail] = useState('');
  //
  // const openSubscribe = () => {
  //   // Append the typed email as a query param so openapis.org can pick it up
  //   // if their form reads it. The hash keeps the user scrolled to the footer
  //   // form on arrival.
  //   const url = email
  //     ? `https://www.openapis.org/?email=${encodeURIComponent(email)}#footer-outer`
  //     : 'https://www.openapis.org/#footer-outer';
  //   window.open(url, '_blank', 'noopener,noreferrer');
  // };

  return (
    <footer
      className="pb-0"
      /* Same recipe as the speakers section: base colour + a 4% white overlay.
         Without it the footer is indistinguishable from the page in dark mode,
         where --brand-footer-bg and --brand-bg are both #15191c.
         The overlay background spans full width; the content sits in the same
         1360px container with 80px side padding as the rest of the page. */
      style={{
        background:
          'linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04)), var(--brand-footer-bg)',
      }}
    >
      {/* Subscribe Section — temporarily disabled. Uncomment (and restore the
          email state + openSubscribe handler above) to bring it back.
      <section className="mx-auto w-full max-w-[1408px] px-6 py-16 md:px-[104px] md:py-20">
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-8 h-16 w-16">
              <img
                src={asset('/img/email.png')}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>

            <h2 className="m-0 mb-4 font-onest text-[24px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[48px]">
              Subscribe
            </h2>
            <p className="m-0 mb-8 max-w-[800px] font-onest text-base font-normal leading-[120%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[32px]">
              Receive notifications about all new events, registration openings and closings, and
              personal invitations
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                openSubscribe();
              }}
              className="relative w-full max-w-[612px] md:flex md:flex-row md:items-center md:gap-2"
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="placeholder:text-[color:var(--ifm-font-color-base)]/48 h-[56px] w-full rounded-[20px] border border-white/10 bg-brand-bg pl-4 pr-[120px] font-onest text-base font-normal tracking-oai text-[color:var(--ifm-font-color-base)] outline-none md:h-[64px] md:min-w-0 md:flex-1 md:pl-6 md:pr-6 md:text-lg"
              />
              <button
                type="submit"
                className="btn-green absolute inset-y-0 right-0 inline-flex cursor-pointer items-center justify-center rounded-[20px] border-none px-4 font-onest text-base font-semibold tracking-oai text-black transition-colors duration-200 md:static md:h-[64px] md:flex-shrink-0 md:px-6 md:text-lg"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
      */}

      {/* Follow updates on social media */}
      <section className="mx-auto w-full max-w-[1408px] px-6 py-16 md:px-[104px] md:py-20">
        <div className="flex items-start">
          <div className="flex-1">
            {/* Heart icon */}
            <div className="mb-8 h-16 w-16">
              <img
                src={asset('/img/heart.svg')}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
            </div>
            <h2 className="m-0 mb-10 font-onest text-[24px] font-bold leading-[110%] tracking-oai text-[color:var(--ifm-font-color-base)] md:text-[48px]">
              Follow updates on social media
            </h2>
            <div className="flex flex-row items-center gap-10">
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/open-api-initiative/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-10 w-10 items-center justify-center text-[color:var(--ifm-font-color-base)] transition-colors hover:text-brand-green active:text-brand-green-pressed"
              >
                <MaskIcon src="/img/linkedin_icon.svg" size={40} />
              </a>
              {/* YouTube */}
              <a
                href="https://www.youtube.com/@OpenApi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-10 w-10 items-center justify-center text-[color:var(--ifm-font-color-base)] transition-colors hover:text-brand-green active:text-brand-green-pressed"
              >
                <MaskIcon src="/img/youtube_icon.svg" size={40} />
              </a>
              {/* Bluesky */}
              <a
                href="https://bsky.app/profile/openapis.org"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bluesky"
                className="flex h-10 w-10 items-center justify-center text-[color:var(--ifm-font-color-base)] transition-colors hover:text-brand-green active:text-brand-green-pressed"
              >
                <MaskIcon src="/img/blueprint_icon.svg" size={34} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom footer bar — content in the 1360 container like the rest */}
      <div>
        <div className="mx-auto flex w-full max-w-[1408px] flex-col items-start justify-between gap-4 px-6 py-6 md:flex-row md:items-center md:px-[104px]">
          <span className="font-onest text-base font-normal tracking-oai text-brand-muted md:text-lg">
            For any questions about the OAI Track, please contact{' '}
            <a
              href="mailto:oai-track@openapis.org"
              className="text-brand-muted underline hover:text-[color:var(--ifm-font-color-base)]"
            >
              oai-track@openapis.org
            </a>
          </span>
          <div className="flex flex-row items-center gap-10">
            <a
              href="https://openapis.org"
              className="font-onest text-base font-normal tracking-oai text-brand-green no-underline hover:underline md:text-lg"
            >
              openapis.org
            </a>
            <a
              href="https://github.com/OAI/.github/blob/main/.github/CODE_OF_CONDUCT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-onest text-base font-normal tracking-oai text-brand-green no-underline hover:underline md:text-lg"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#65D100"
                strokeWidth="1.5"
              >
                <rect x="2" y="4" width="12" height="9" rx="1" />
                <path d="M5 2v3M11 2v3" />
              </svg>
              Code of Conduct
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
