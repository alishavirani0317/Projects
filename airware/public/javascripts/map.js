// map.js

let map = null;
let statesLayer = null;

let timeMap = null;
let timeStatesLayer = null;

let usStatesGeojson = null;

// Placeholder map, will be replaced by server data
let stateMetrics2024 = {};
let stateMetricsLower = {}; // lowercased key -> canonical key

async function fetchStateMetrics(year = 2024, pollutant = 'Carbon Dioxide') {
  // try a list of synonyms for the pollutant if results look empty (helps with proc naming differences)
  const synonyms = {
    'Carbon Dioxide': ['Carbon Dioxide', 'Carbon Monoxide', 'CO2', 'CO'],
    'Sulfur Dioxide': ['Sulfur Dioxide', 'SO2', 'Sulphur Dioxide'],
    'Nitrogen Oxides': ['Nitrogen Oxides', 'NO2', 'NOx']
  };

  const tried = new Set();
  const list = synonyms[pollutant] || [pollutant];

  for (const candidate of list) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      console.log('fetchStateMetrics trying pollutant:', candidate);
      const resp = await fetch(`/state_metrics?year=${encodeURIComponent(year)}&pollutant=${encodeURIComponent(candidate)}`);
      if (!resp.ok) throw new Error('Failed to fetch state metrics');
      const payload = await resp.json();
      if (payload.success && payload.metrics) {
        // check that payload has meaningful numeric data for several states
        let goodCount = 0;
        for (const v of Object.values(payload.metrics)) {
          if ((v.totalEmissions && Number(v.totalEmissions) > 0) || (v.medianAqi !== null && v.medianAqi !== undefined)) goodCount++;
        }

        if (goodCount >= 5 || candidate === list[list.length - 1]) {
          stateMetrics2024 = payload.metrics;
          // build lowercase lookup map
          stateMetricsLower = {};
          for (const k of Object.keys(stateMetrics2024)) {
            stateMetricsLower[String(k).trim().toLowerCase()] = k;
          }
          console.log('Loaded state metrics for', year, Object.keys(stateMetrics2024).length, 'states (pollutant=', candidate, ', goodCount=', goodCount, ')');
          return;
        }

        console.warn('pollutant', candidate, 'returned too few metric rows (', goodCount, '). Trying next synonym.');
        // otherwise try next synonym
      } else {
        console.warn('state_metrics returned no metrics for', candidate);
      }
    } catch (err) {
      console.error('Error fetching state metrics for', candidate, err);
    }
  }

  console.warn('fetchStateMetrics: all synonyms exhausted, leaving stateMetrics2024 as-is');
}

// Build tooltip HTML for a given state name
function buildTooltipHtml(stateName) {
  // try exact key, then lowercase-normalized key
  let metrics = stateMetrics2024[stateName];
  if (!metrics) {
    const k = stateMetricsLower[String(stateName).trim().toLowerCase()];
    if (k) metrics = stateMetrics2024[k];
  }
  let html = `<strong>${stateName}</strong>`;

  if (metrics) {
    const total = metrics.totalEmissions;
    const totalStr =
      typeof total === 'number' ? total.toLocaleString() : total;

    html += `<br>Median AQI (2024): <strong>${metrics.medianAqi}</strong>`;
    html += `<br>Total Emissions: <strong>${totalStr}</strong>`;
  } else {
    html += `<br><em>No 2024 data available</em>`;
  }

  return html;
}

// Load US states GeoJSON once, then reuse
function loadUsStates(callback) {
  if (usStatesGeojson) {
    callback(usStatesGeojson);
    return;
  }

  fetch('/data/us-states.json')
    .then(res => res.json())
    .then(data => {
      usStatesGeojson = data;
      callback(data);
    })
    .catch(err => {
      console.error('Error loading US states GeoJSON:', err);
    });
}

// Main Air Quality Map
window.initAirQualityMap = function () {
  // Already created? just fix size
  if (map) {
    map.invalidateSize();
    return;
  }

  const mapDiv = document.getElementById('map');
  if (!mapDiv) return;

  map = L.map('map', {
    zoomControl: false
  }).setView([38.5, -97], 4);

  const southWest = L.latLng(24, -125);
  const northEast = L.latLng(50, -66);
  const bounds = L.latLngBounds(southWest, northEast);
  map.setMaxBounds(bounds);
  map.on('drag', () => {
    map.panInsideBounds(bounds, { animate: false });
  });

  loadUsStates(data => {
    const defaultStyle = {
      color: '#555',
      weight: 2,
      fillColor: '#f0f0f0',
      fillOpacity: 1
    };

    const highlightStyle = {
      fillColor: '#7fb6ff'
    };

    statesLayer = L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: (feature, layer) => {
        const stateName = feature.properties.name;
        const tooltipHtml = buildTooltipHtml(stateName);
        layer.bindTooltip(tooltipHtml, { sticky: true });

        // layer.on('mouseover', e => {
        //   e.target.setStyle(highlightStyle);
        // });

        // layer.on('mouseout', e => {
        //   statesLayer.resetStyle(e.target);
        // });
      }
    }).addTo(map);
  });

  // After layer added, fetch server metrics and update tooltips
  fetchStateMetrics(2024).then(() => {
    if (statesLayer) {
      statesLayer.eachLayer(layer => {
        const name = layer.feature.properties.name;
        layer.unbindTooltip();
        layer.bindTooltip(buildTooltipHtml(name), { sticky: true });
      });
    }
  }).catch(() => {});

  L.control.zoom({ position: 'bottomright' }).addTo(map);
};

// Time Lapse Map
window.initTimeLapseMap = function (year) {
  const tlDiv = document.getElementById('timeLapseMap');
  if (!tlDiv) return;

  // Already created? just fix size
  if (timeMap) {
    timeMap.invalidateSize();
    return;
  }

  timeMap = L.map('timeLapseMap', {
    zoomControl: false
  }).setView([38.5, -97], 4);

  const southWest = L.latLng(24, -125);
  const northEast = L.latLng(50, -66);
  const bounds = L.latLngBounds(southWest, northEast);
  timeMap.setMaxBounds(bounds);
  timeMap.on('drag', () => {
    timeMap.panInsideBounds(bounds, { animate: false });
  });

  loadUsStates(data => {
    const defaultStyle = {
      color: '#555',
      weight: 2,
      fillColor: '#f0f0f0',
      fillOpacity: 1
    };
    timeStatesLayer = L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: (feature, layer) => {
        const stateName = feature.properties.name;
        const tooltipHtml = buildTooltipHtml(stateName);

        layer.bindTooltip(tooltipHtml, {
          sticky: true
        });
      }
    }).addTo(timeMap);
  });
  L.control.zoom({ position: 'bottomright' }).addTo(timeMap);
};
