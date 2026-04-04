import React from 'react';
import Hero from '../components/Hero';
import About from '../components/About';
import Menu from '../components/Menu';
import DiningExperience from '../components/DiningExperience';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import DirectOrderBanner from '../components/DirectOrderBanner';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      <DirectOrderBanner />
      <main>
        <Hero />
        <About />
        <Menu />
        <DiningExperience />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;