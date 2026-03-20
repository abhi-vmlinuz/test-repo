import { SmoothScroll } from '@/components/landing/SmoothScroll';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Modules } from '@/components/landing/Modules';
import { Navbar } from '@/components/landing/Navbar';
import { ParallaxDecorations } from '@/components/landing/ParallaxDecorations';
import Footer from '@/components/Footer';

const LandingPage = () => {
  return (
    <SmoothScroll>
      <div className="relative selection:bg-zinc-900 selection:text-white">
        <div className="relative z-10 bg-white rounded-b-3xl shadow-2xl mb-[800px]">
          {/* Navbar is fixed, but we want it to blend with content. 
                 Ideally Navbar should be inside the scrollable area or stick to top Z-50. 
                 For now, it's fixed in Navbar component. */}
          <Navbar />
          <Hero />

          <div className="relative isolate">
            <Features />
            <Modules />
            <ParallaxDecorations />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full z-0 pointer-events-none">
          {/* This wrapper is just to hold the footer in place visually if needed, 
                 but the FOOTER component itself has fixed logic. 
                 Actually, my Footer component has 'fixed bottom-0' INSIDE it.
                 So here we just need to render it. 
                 Wait, if Footer has 'fixed' inside, it will cover the content if z-index is higher.
                 Footer has z-0? No, let's check. 
                 My Footer redesign has: <div className="fixed bottom-0 ... bg-zinc-950">
                 The wrapper above needs z-10 and bg-white to cover it.
                 */}
          <div className="pointer-events-auto">
            <Footer />
          </div>
        </div>
      </div>
    </SmoothScroll>
  );
};

export default LandingPage;
