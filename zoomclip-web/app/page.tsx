import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Pricing } from "@/components/landing/Pricing";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg">
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
