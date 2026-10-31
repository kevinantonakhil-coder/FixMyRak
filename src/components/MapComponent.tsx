import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Report, ReportCategory, ReportStatus, RAK_PRESET_LOCATIONS } from '../types';
import { MapPin, Navigation, Compass, Layers, CheckCircle, Clock, AlertTriangle, RefreshCw, Key, ExternalLink, X } from 'lucide-react';

interface MapComponentProps {
  reports?: Report[];
  selectedReport?: Report | null;
  onSelectReport?: (report: Report) => void;
  // Picker mode props
  isPickerMode?: boolean;
  pickerLat?: number;
  pickerLng?: number;
  onPickerLocationChange?: (lat: number, lng: number, label?: string) => void;
  height?: string;
  zoomLevel?: number;
}

const DEFAULT_CARTO_KEY = 'cb1_4yxz_1_3649369b315d6468ddfd0217';

export const MapComponent: React.FC<MapComponentProps> = ({
  reports = [],
  selectedReport,
  onSelectReport,
  isPickerMode = false,
  pickerLat = 25.7895,
  pickerLng = 55.9432,
  onPickerLocationChange,
  height = '500px',
  zoomLevel = 11,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [cartoKey, setCartoKey] = useState<string>(() => {
    return localStorage.getItem('fixmyrak_carto_key') || (import.meta.env.VITE_CARTO_API_KEY as string) || DEFAULT_CARTO_KEY;
  });
  const [inputKey, setInputKey] = useState(cartoKey);

  // Initialize Map with Voyager Tiles exclusively
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    const initialLat = isPickerMode ? pickerLat : 25.7895;
    const initialLng = isPickerMode ? pickerLng : 55.9432;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: zoomLevel,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const trimmedKey = cartoKey.trim();
    const tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${trimmedKey ? `?key=${trimmedKey}` : ''}`;
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    const baseTileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = baseTileLayer;
    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    // If picker mode, handle map clicks to move marker
    if (isPickerMode) {
      const pinIcon = L.divIcon({
        className: 'picker-pin',
        html: `
          <div style="background-color: #0284c7; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45); border: 3px solid white; cursor: grab;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });

      const pickerMarker = L.marker([pickerLat, pickerLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      pickerMarker.on('dragend', () => {
        const position = pickerMarker.getLatLng();
        if (onPickerLocationChange) {
          onPickerLocationChange(position.lat, position.lng);
        }
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        pickerMarker.setLatLng(e.latlng);
        if (onPickerLocationChange) {
          onPickerLocationChange(e.latlng.lat, e.latlng.lng);
        }
      });

      pickerMarkerRef.current = pickerMarker;
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);


  // Update Picker Position from External Props
  useEffect(() => {
    if (isPickerMode && pickerMarkerRef.current && mapInstanceRef.current) {
      const currentPos = pickerMarkerRef.current.getLatLng();
      if (currentPos.lat !== pickerLat || currentPos.lng !== pickerLng) {
        pickerMarkerRef.current.setLatLng([pickerLat, pickerLng]);
        mapInstanceRef.current.panTo([pickerLat, pickerLng]);
      }
    }
  }, [pickerLat, pickerLng, isPickerMode]);

  // Update Interactive Report Markers
  useEffect(() => {
    if (isPickerMode || !markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    reports.forEach((report) => {
      if (!report.latitude || !report.longitude) return;

      const getStatusColor = (status: ReportStatus) => {
        switch (status) {
          case 'Submitted':
            return '#f59e0b'; // amber
          case 'Under Review':
            return '#0284c7'; // sky
          case 'In Progress':
            return '#8b5cf6'; // violet
          case 'Resolved':
            return '#10b981'; // emerald
          default:
            return '#64748b';
        }
      };

      const color = getStatusColor(report.status);
      const isCurrentSelected = selectedReport?.id === report.id;

      const markerHtml = `
        <div class="custom-pin ${isCurrentSelected ? 'custom-pin-pulse' : ''}" style="
          background-color: ${color};
          width: ${isCurrentSelected ? '38px' : '30px'};
          height: ${isCurrentSelected ? '38px' : '30px'};
          border: 2.5px solid white;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [isCurrentSelected ? 38 : 30, isCurrentSelected ? 38 : 30],
        iconAnchor: [isCurrentSelected ? 19 : 15, isCurrentSelected ? 19 : 15],
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      marker.on('click', () => {
        if (onSelectReport) {
          onSelectReport(report);
        }
      });

      // Quick hover tooltip
      marker.bindTooltip(
        `<strong>${report.title}</strong><br/><span style="color:${color}; font-weight:600;">${report.status}</span> &bull; ${report.category}`,
        { direction: 'top', offset: [0, -10] }
      );

      markersLayerRef.current?.addLayer(marker);
    });
  }, [reports, selectedReport, isPickerMode]);

  // Center on Selected Report
  useEffect(() => {
    if (selectedReport && mapInstanceRef.current && !isPickerMode) {
      if (selectedReport.latitude && selectedReport.longitude) {
        mapInstanceRef.current.flyTo([selectedReport.latitude, selectedReport.longitude], 14, {
          duration: 1.2,
        });
      }
    }
  }, [selectedReport]);

  // Dynamically update Voyager tile layer if API key changes
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const trimmed = cartoKey.trim();
      const newUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${trimmed ? `?key=${trimmed}` : ''}`;
      const newLayer = L.tileLayer(newUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(mapInstanceRef.current);
      newLayer.bringToBack();
      tileLayerRef.current = newLayer;
    }
  }, [cartoKey]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([25.7895, 55.9432], 11, { duration: 1 });
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
        }
        if (isPickerMode && onPickerLocationChange) {
          onPickerLocationChange(latitude, longitude, 'Current GPS Location');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not retrieve your location. Please drop the pin on the map.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSaveKey = () => {
    const cleaned = inputKey.trim() || DEFAULT_CARTO_KEY;
    setCartoKey(cleaned);
    if (inputKey.trim()) {
      localStorage.setItem('fixmyrak_carto_key', cleaned);
    } else {
      localStorage.removeItem('fixmyrak_carto_key');
    }
    setShowKeyModal(false);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-50">
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Floating Map Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleResetView}
          className="bg-white/95 backdrop-blur-xs text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm border border-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-[#143d35]" />
          Reset RAK View
        </button>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="bg-white/95 backdrop-blur-xs text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm border border-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5 text-[#e97950]" />
          My Location
        </button>

        <button
          type="button"
          onClick={() => setShowKeyModal(true)}
          className="bg-white/95 backdrop-blur-xs text-[#143d35] hover:text-[#143d35] px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs border border-[#143d35]/30 flex items-center gap-1.5 transition-colors hover:bg-[#d7edbd]/40"
          title="Voyager Basemap Tiles (Active)"
        >
          <Layers className="w-3.5 h-3.5 text-[#e97950]" />
          Voyager Tiles
        </button>
      </div>

      {/* Preset Location Pills (In Picker Mode) */}
      {isPickerMode && (
        <div className="absolute bottom-3 left-3 right-12 z-[1000] bg-white/95 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-md">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-600" />
            Quick RAK Landmarks (Click to pin)
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {RAK_PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  if (onPickerLocationChange) {
                    onPickerLocationChange(preset.lat, preset.lng, preset.name);
                  }
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([preset.lat, preset.lng], 14, { duration: 0.8 });
                  }
                }}
                className="whitespace-nowrap px-2.5 py-1 text-xs bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 rounded-md font-medium border border-slate-200 transition-colors shrink-0"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Legend (In Viewer Mode) */}
      {!isPickerMode && reports.length > 0 && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md hidden sm:flex items-center gap-4 text-xs font-medium text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Submitted
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            Under Review
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
            In Progress
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Resolved
          </div>
        </div>
      )}
      {/* Voyager Basemap Info & Free Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f6f7f3] border border-[#e4e9e1] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-[#143d35]">
            <button
              type="button"
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#143d35] text-[#d7edbd] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#143d35] leading-tight">Voyager Basemap</h3>
                <p className="text-xs text-stone-600">CARTO Voyager Tiles is the active map layer</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-stone-700 bg-white p-4 rounded-xl border border-[#e4e9e1] mb-4">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-[#143d35] min-w-[90px]">Layer Style:</span>
                <span className="font-mono text-[#143d35] bg-[#d7edbd]/50 px-2 py-0.5 rounded">CARTO Voyager</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-[#143d35] min-w-[90px]">Cost:</span>
                <span className="text-emerald-700 font-bold">100% Free ($0.00) &bull; No card required</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-[#143d35] min-w-[90px]">Free Key Link:</span>
                <a
                  href="https://carto.com/basemaps/apikey/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#e97950] font-semibold hover:underline flex items-center gap-1"
                >
                  carto.com/basemaps/apikey <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#143d35] mb-1.5">
                Free CARTO API Key (Optional &mdash; removes tile watermark)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Paste your free key here..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#e4e9e1] focus:outline-none focus:ring-2 focus:ring-[#143d35] text-[#143d35]"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Entering a key is completely optional. If left blank, Voyager tiles continue loading normally.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-200/50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#143d35] hover:bg-[#143d35]/90 text-white transition-colors"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
