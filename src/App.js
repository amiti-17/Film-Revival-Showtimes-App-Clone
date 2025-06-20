import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MovieDetail from './MovieDetail';
import './MovieDetail.css'; // or './App.css'
import './App.css'; // <-- import the stylesheet
import { FilmRevival } from './FilmRevival';

// Initialize GA
const TRACKING_ID = "G-WWNQX4K009";

// Define gtag as a global function
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;

function App() {
  useEffect(() => {
    // Load the GA script
    const script1 = document.createElement('script');
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${TRACKING_ID}`;
    script1.async = true;
    document.head.appendChild(script1);

    // Initialize GA
    gtag('js', new Date());
    gtag('config', TRACKING_ID);
  }, []);

  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FilmRevival />} />
          <Route path="/movie/:movieId" element={<MovieDetail />} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;