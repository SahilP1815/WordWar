import React, { useState, useEffect } from 'react';
import { X, MapPin, Globe, Loader2, BookOpen } from 'lucide-react';

export default function PlaceExplorerModal({ place, onClose }) {
  const [loading, setLoading] = useState(true);
  const [placeInfo, setPlaceInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!place) return;

    setLoading(true);
    setError(false);
    setPlaceInfo(null);

    // Fetch details from Wikipedia API
    const fetchPlaceDetails = async () => {
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place)}`
        );
        if (!response.ok) {
          throw new Error('Place not found in Wikipedia');
        }
        const data = await response.json();
        setPlaceInfo({
          title: data.title || place,
          description: data.description || 'Geographical location',
          extract: data.extract || 'No detailed summary available.',
          image: data.originalimage?.source || data.thumbnail?.source || null,
          wikiUrl: data.content_urls?.desktop?.page || null
        });
      } catch (err) {
        console.error('Error fetching place details:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [place]);

  if (!place) return null;

  // Google Maps Embed URL (free, no API key required)
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(place)}&t=&z=12&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row h-[600px] max-h-[90vh] relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shadow-md"
        >
          <X size={18} />
        </button>

        {/* Left Panel: Information & Image */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-800/50">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">
              <MapPin size={14} />
              <span>Place Explorer</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight capitalize mb-1">
              {placeInfo?.title || place}
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={36} />
                <span className="text-sm font-medium">Gathering details from Google Maps & Wikipedia...</span>
              </div>
            ) : error ? (
              <div className="mt-4 bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4 text-slate-400 text-sm">
                <p className="font-semibold text-slate-300 mb-1 flex items-center gap-2">
                  <Globe size={14} className="text-amber-500" />
                  Limited offline info
                </p>
                No Wikipedia summary was found for this place, but you can explore its interactive Google Map to the right!
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {placeInfo?.description && (
                  <p className="text-sm font-bold text-indigo-300 tracking-wide bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl inline-block">
                    {placeInfo.description}
                  </p>
                )}

                {placeInfo?.image && (
                  <div className="w-full h-40 rounded-2xl overflow-hidden border border-slate-800 relative group">
                    <img 
                      src={placeInfo.image} 
                      alt={placeInfo.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                  </div>
                )}

                <p className="text-slate-300 text-sm leading-relaxed font-normal">
                  {placeInfo?.extract}
                </p>
              </div>
            )}
          </div>

          {placeInfo?.wikiUrl && (
            <a 
              href={placeInfo.wikiUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mt-6 inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3 px-4 rounded-xl border border-slate-700/50 transition-all hover:scale-[1.02] active:scale-95"
            >
              <BookOpen size={14} />
              Read Full Article on Wikipedia
            </a>
          )}
        </div>

        {/* Right Panel: Interactive Google Map */}
        <div className="flex-1 bg-slate-950 h-full relative">
          <iframe
            title={`Google Map for ${place}`}
            width="100%"
            height="100%"
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            src={mapEmbedUrl}
          />
        </div>
      </div>
    </div>
  );
}
