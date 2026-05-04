let airQualityChart = null;

window.initAirQualityGraph = function () {
  // If chart already exists, just refresh
  if (airQualityChart) {
    airQualityChart.update();
    return;
  }

  const canvas = document.getElementById('airQualityChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // X-axis labels (years)
  const labels = [
    'Fuel Comb - Comm/Institutional - Biomass',
    'Fuel Comb - Comm/Institutional - Natural Gas',
    'Fuel Comb - Comm/Institutional - Oil',
    'Fuel Comb - Industrial Boilers, ICEs - Biomass',
    'Fuel Comb - Industrial Boilers, ICEs - Natural Gas',
    'Fuel Comb - Industrial Boilers, ICEs - Oil',
    'Fuel Comb - Residential - Natural Gas',
    'Fuel Comb - Residential - Wood',
    'Mobile - On-Road non-Diesel Light Duty Vehicles',
    'Commercial Cooking',
    'Fires - Agricultural Field Burning',
    'Fires - Prescribed Fires',
    'Mobile - On-Road Diesel Heavy Duty Vehicles',
    'Mobile - On-Road Diesel Light Duty Vehicles',
    'Mobile - On-Road non-Diesel Heavy Duty Vehicles',
    'Waste Disposal',
    'Industrial Processes - Oil & Gas Production',
    'Mobile - Locomotives',
    'Fires - Wildfires',
    'Fuel Comb - Comm/Institutional - Coal',
    'Fuel Comb - Industrial Boilers, ICEs - Coal',
    'Industrial Processes - Petroleum Refineries'
  ];

  // Example data – make sure length matches labels
  const co2Data =  [2, 3, 4, 5, 7, 9, 12, 15, 19, 24, 30, 36, 42, 47, 51, 54, 56, 58, 59, 60, 60, 60];
  const so2Data =  [1, 2, 3, 4, 5, 7, 9, 12, 15, 19, 23, 28, 33, 38, 42, 46, 49, 52, 55, 57, 59, 60];
  const no2Data =  [1, 2, 2, 3, 4, 6, 8, 10, 13, 17, 21, 26, 31, 36, 41, 45, 49, 52, 55, 57, 59, 60];

  // Store all datasets so we can switch later
  const allDatasets = {
    co2: {
      label: 'CO₂',
      data: co2Data,
      backgroundColor: 'rgba(255, 0, 0, 0.7)',
      borderColor: 'rgb(255, 0, 0)',
      borderWidth: 2
    },
    so2: {
      label: 'SO₂',
      data: so2Data,
      backgroundColor: 'rgba(0, 200, 0, 0.7)',
      borderColor: 'rgb(0, 200, 0)',
      borderWidth: 2
    },
    no2: {
      label: 'NO₂',
      data: no2Data,
      backgroundColor: 'rgba(0, 0, 255, 0.7)',
      borderColor: 'rgb(0, 0, 255)',
      borderWidth: 2
    }
  };

  airQualityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      // start with CO2 only
      datasets: [allDatasets.co2]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Year'
          },
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Concentration / Index'
          }
        }
      }
    }
  });

  // stash all datasets on the chart instance for later
  airQualityChart._allDatasets = allDatasets;
};

// Called from your buttons to switch which pollutant is shown
window.setGraphPollutant = function (pollutantKey) {
  if (!airQualityChart || !airQualityChart._allDatasets) return;

  const ds = airQualityChart._allDatasets[pollutantKey];
  if (!ds) return;

  airQualityChart.data.datasets = [ds];
  airQualityChart.update();
};
