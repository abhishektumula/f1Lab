import F1Game from "@/components/F1Game";
import { SITE, SITE_URL } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE.name,
  description: SITE.description,
  url: SITE_URL,
  applicationCategory: "GameApplication",
  genre: "Racing",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a keyboard",
  inLanguage: "en",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {/* The game is a canvas, so this is the text that search engines and screen readers get. */}
      <div className="sr-only">
        <h1>{SITE.name}: drive a Formula 1 car around your screen</h1>
        <p>{SITE.description}</p>
        <p>
          Hold Space to start the engine, drive with the arrow keys, and hold Tab to switch it off. Hold the
          throttle and steer to burn a donut. Hit a wall and the car takes damage; park in the pit box on the
          right to repair it.
        </p>
      </div>
      <F1Game />
    </main>
  );
}
