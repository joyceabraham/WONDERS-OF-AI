const BACKEND_URL = 'http://localhost:3000';

lucide.createIcons();

// State Store
let rawAnalysisData = null;

// Preset Examples
const PRESETS = {
  ecommerce: `E-Commerce Platform with microservices:
1. React Frontend hosted on Netlify
2. API Gateway running Express.js
3. PostgreSQL RDS database containing user account & payment history
4. Stripe External API integration for credit card payments
5. Redis Cache for user sessions`,

  fintech: `FinTech Banking API Architecture:
1. Public Mobile Client (iOS/Android)
2. AWS Application Load Balancer
3. OAuth2 / Auth0 Authentication Server
4. Core Banking Microservices (Docker / Kubernetes)
5. MongoDB database storing transaction logs`
};

function loadPreset(key) {
  document.getElementById('architecture-input').value = PRESETS[key];
}


// ===============================
// RUN THREAT ANALYSIS
// ===============================
async function runAnalysis() {

  const input = document.getElementById('architecture-input').value.trim();
  const btn = document.getElementById('analyze-btn');
  const threatListContainer = document.getElementById('threat-list');

  if (!input) {
    alert('Please enter or paste an architecture description.');
    return;
  }

  // Loading UI
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spin"></i> Analyzing...`;
  lucide.createIcons();

  threatListContainer.innerHTML = `
    <div class="empty-state">
      <p>🧠 AI analyzing attack vectors and STRIDE threats...</p>
    </div>
  `;

  try {

    console.log("Sending request to:", BACKEND_URL);

    const response = await fetch(`${BACKEND_URL}/api/threat-model`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        architecture: input
      })
    });

    console.log("Response status:", response.status);

    if (!response.ok) {

      let errorMessage = 'API server returned an error';

      try {
        const errorData = await response.json();

        errorMessage =
          errorData.details ||
          errorData.error ||
          errorMessage;

      } catch (e) {
        // Ignore JSON parsing error
      }

      throw new Error(errorMessage);
    }

    rawAnalysisData = await response.json();

    console.log("Threat model received:", rawAnalysisData);

    // Render results
    renderMetrics(rawAnalysisData);

    renderCanvasDiagram(
      rawAnalysisData.components || []
    );

    renderThreats(
      rawAnalysisData.threats || [],
      'ALL'
    );

  } catch (error) {

    console.error('Analysis error:', error);

    threatListContainer.innerHTML = `
      <div class="empty-state"
           style="color: var(--severity-critical)">
        <p>⚠️ ${error.message}</p>
      </div>
    `;

  } finally {

    btn.disabled = false;

    btn.innerHTML =
      `<i data-lucide="sparkles"></i> Generate Threat Model`;

    lucide.createIcons();
  }
}


// ===============================
// RENDER METRICS
// ===============================
function renderMetrics(data) {

  document
    .getElementById('metrics-card')
    .classList.remove('hidden');

  document.getElementById('risk-level').innerText =
    data.overallRisk || 'HIGH';

  document.getElementById('confidence-score').innerText =
    data.confidenceScore || '90%';

  document.getElementById('threat-count').innerText =
    (data.threats || []).length;
}


// ===============================
// RENDER THREATS
// ===============================
function renderThreats(threats, filterCategory) {

  const container =
    document.getElementById('threat-list');

  container.innerHTML = '';

  const filtered =
    filterCategory === 'ALL'
      ? threats
      : threats.filter(
          t => t.type === filterCategory
        );

  if (filtered.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        <p>No threats found for this filter category.</p>
      </div>
    `;

    return;
  }

  filtered.forEach((threat, index) => {

    // Backend currently does not return severity
    const severity =
      threat.severity ||
      rawAnalysisData.overallRisk ||
      'Medium';

    const severityClass =
      severity.toLowerCase();

    // Backend currently does not return ID
    const threatId =
      threat.id ||
      `${threat.type
        ? threat.type.charAt(0)
        : 'T'}${index + 1}`;

    const card =
      document.createElement('div');

    card.className =
      `threat-card ${severityClass}`;

    card.innerHTML = `
      <div class="threat-meta">

        <span class="threat-badge badge-${severityClass}">
          ${severity}
        </span>

        <span style="
          font-size: 0.75rem;
          color: var(--text-muted);
        ">
          ${threat.type || 'STRIDE'} (${threatId})
        </span>

      </div>

      <div class="threat-title">
        ${threat.title || 'Threat'}
      </div>

      <div class="threat-desc">
        ${threat.description || ''}
      </div>

      <div class="threat-mitigation">
        <strong>Mitigation:</strong>
        ${threat.mitigation || 'Apply appropriate security controls.'}
      </div>
    `;

    container.appendChild(card);
  });
}


// ===============================
// FILTER THREATS
// ===============================
function filterThreats(category) {

  document
    .querySelectorAll('.tab-btn')
    .forEach(btn =>
      btn.classList.remove('active')
    );

  if (event && event.target) {
    event.target.classList.add('active');
  }

  if (
    rawAnalysisData &&
    rawAnalysisData.threats
  ) {

    renderThreats(
      rawAnalysisData.threats,
      category
    );
  }
}


// ===============================
// D3 NETWORK DIAGRAM
// ===============================
function renderCanvasDiagram(components) {

  const container =
    document.getElementById('diagram-canvas');

  container.innerHTML = '';

  if (
    !components ||
    components.length === 0
  ) {
    return;
  }

  const width =
    container.clientWidth || 600;

  const height = 210;

  const nodes =
    components.map((c, i) => ({
      id: c.id || `node-${i}`,
      name: c.name || `Component ${i + 1}`,
      type: c.type || 'component'
    }));

  const links = [];

  for (
    let i = 0;
    i < nodes.length - 1;
    i++
  ) {

    links.push({
      source: nodes[i].id,
      target: nodes[i + 1].id
    });
  }

  const svg =
    d3.select('#diagram-canvas')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

  const simulation =
    d3.forceSimulation(nodes)
      .force(
        'link',
        d3.forceLink(links)
          .id(d => d.id)
          .distance(100)
      )
      .force(
        'charge',
        d3.forceManyBody()
          .strength(-200)
      )
      .force(
        'center',
        d3.forceCenter(
          width / 2,
          height / 2
        )
      );

  const link =
    svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

  const node =
    svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(
        d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

  node.append('circle')
    .attr('r', 18)
    .attr('fill', '#06b6d4')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 2);

  node.append('text')
    .text(d => d.name)
    .attr('x', 0)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#f9fafb')
    .attr('font-size', '10px');

  simulation.on('tick', () => {

    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr(
      'transform',
      d => `translate(${d.x},${d.y})`
    );
  });


  function dragstarted(event, d) {

    if (!event.active) {
      simulation
        .alphaTarget(0.3)
        .restart();
    }

    d.fx = d.x;
    d.fy = d.y;
  }


  function dragged(event, d) {

    d.fx = event.x;
    d.fy = event.y;
  }


  function dragended(event, d) {

    if (!event.active) {
      simulation.alphaTarget(0);
    }

    d.fx = null;
    d.fy = null;
  }
}
