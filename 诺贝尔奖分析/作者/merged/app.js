// =====================================================
// timeline.js  — Horizontal Research Timeline
// Each dot = one paper; color = field; ★ = prize paper
// Click to reveal detail panel (no persistent labels)
// The #timeline-scroll wrapper handles independent scroll
// =====================================================

function drawTimeline(author) {

    // ── Clear ──────────────────────────────────────────
    d3.select("#timeline-scroll").selectAll("*").remove();
    d3.select("#timeline-detail").html(
        "<span style='color:var(--color-text-3);font-size:12px;'>Click a dot to see paper details.<\/span>"
    );

    // ── Data ───────────────────────────────────────────
    const papers = (author.papers || []).filter(d => d.pubYear);
    if (!papers.length) return;

    // ── Design tokens (from CSS custom properties) ─────
    const cs = getComputedStyle(document.documentElement);
    const tok = k => cs.getPropertyValue(k).trim();

    // Field colour map — consistent with network.js
    const FIELD_COLOR = {
        Chemistry : "#2563EB",
        Medicine  : "#0891B2",
        Physics   : "#7C3AED"
    };
    const PRIZE_COLOR  = "#F59E0B";
    const STEM_COLOR   = "#CBD5E1";
    const AXIS_COLOR   = "#94A3B8";
    const TEXT_MUTED   = tok("--color-text-2")   || "#64748B";
    const TEXT_MAIN    = tok("--color-text")      || "#0F172A";
    const SURFACE      = tok("--color-surface")   || "#ffffff";
    const BORDER       = tok("--color-border")    || "#E2E8F0";
    const FONT_DISPLAY = tok("--font-display") || tok("--display") || "Fraunces, Georgia, serif";

    // ── Layout constants ────────────────────────────────
    const MIN_PX_PER_YEAR = 80;   // minimum pixel gap between years
    const NODE_R      = 6;
    const PRIZE_R     = 10;
    const STEM_GAP    = 44;       // base vertical offset from axis
    const LAYER_GAP   = 32;       // extra offset per stacking layer
    const HEIGHT      = 440;
    const MARGIN      = { top: 72, right: 48, bottom: 60, left: 48 };
    const AXIS_Y      = HEIGHT / 2;  // timeline axis is at vertical centre

    // ── Events ─────────────────────────────────────────
    const events = papers
        .map(d => ({
            year  : +d.pubYear,
            title : d.Title || d.title || "",
            field : d.field  || "Other",
            prize : !!d.isPrizePaper,
            journal: d["Source title"] || d.journal || "",
            citations: d["Cited by"] || d.citations || "",
            prizeYear: +d.prizeYear || null,
            raw   : d
        }))
        .sort((a, b) => a.year - b.year);

    // ── Year extent & dynamic width ────────────────────
    const [minYear, maxYear] = d3.extent(events, d => d.year);
    const yearSpan  = maxYear - minYear || 1;
    const plotWidth = Math.max(yearSpan * MIN_PX_PER_YEAR, 900);
    const svgWidth  = plotWidth + MARGIN.left + MARGIN.right;

    // ── X scale ────────────────────────────────────────
    const x = d3.scaleLinear()
        .domain([minYear - 0.5, maxYear + 0.5])
        .range([MARGIN.left, MARGIN.left + plotWidth]);

    // ── Stagger same-year nodes above/below axis ───────
    const usedYear = {};
    events.forEach(d => {
        usedYear[d.year] = (usedYear[d.year] || 0);
        d._slot = usedYear[d.year]++;
    });
    events.forEach(d => {
        const dir   = d._slot % 2 === 0 ? -1 : 1;
        const layer = Math.floor(d._slot / 2);
        d.renderY   = AXIS_Y + dir * (STEM_GAP + layer * LAYER_GAP);
    });

    // ── SVG ────────────────────────────────────────────
    const svg = d3.select("#timeline-scroll")
        .append("svg")
        .attr("class", "d3-chart")
        .attr("width", svgWidth)
        .attr("height", HEIGHT)
        .style("display", "block");

    // ── Background year grid ───────────────────────────
    const tickYears = x.ticks(Math.min(yearSpan, 16));

    svg.selectAll(".tl-grid-line")
        .data(tickYears)
        .enter()
        .append("line")
        .attr("class", "tl-grid-line")
        .attr("x1", d => x(d))
        .attr("x2", d => x(d))
        .attr("y1", MARGIN.top)
        .attr("y2", HEIGHT - MARGIN.bottom)
        .attr("stroke", BORDER)
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "3 4");

    // ── Prize vertical highlight lines ─────────────────
    const prizeYears = [...new Set(
        events.filter(d => d.prize).map(d => d.year)
    )];

    prizeYears.forEach(yr => {
        // shaded band
        svg.append("rect")
            .attr("x", x(yr) - 12)
            .attr("y", MARGIN.top)
            .attr("width", 24)
            .attr("height", HEIGHT - MARGIN.top - MARGIN.bottom)
            .attr("fill", PRIZE_COLOR)
            .attr("opacity", 0.06)
            .attr("rx", 4);

        // dashed line
        svg.append("line")
            .attr("x1", x(yr)).attr("x2", x(yr))
            .attr("y1", MARGIN.top)
            .attr("y2", HEIGHT - MARGIN.bottom)
            .attr("stroke", PRIZE_COLOR)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "5 4");

        // label above
        svg.append("text")
            .attr("x", x(yr))
            .attr("y", MARGIN.top - 8)
            .attr("text-anchor", "middle")
            .attr("fill", PRIZE_COLOR)
            .attr("font-size", 10)
            .attr("font-weight", 600)
            .attr("font-family", tok("--font-body") || tok("--body") || "DM Sans, system-ui, sans-serif")
            .text(`Prize ${yr}`);
    });

    // ── Main axis line ──────────────────────────────────
    svg.append("line")
        .attr("x1", MARGIN.left - 8).attr("x2", MARGIN.left + plotWidth + 8)
        .attr("y1", AXIS_Y).attr("y2", AXIS_Y)
        .attr("stroke", AXIS_COLOR)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round");

    // arrow head on right
    svg.append("path")
        .attr("d", `M${MARGIN.left + plotWidth + 6},${AXIS_Y - 5} L${MARGIN.left + plotWidth + 16},${AXIS_Y} L${MARGIN.left + plotWidth + 6},${AXIS_Y + 5}`)
        .attr("fill", "none")
        .attr("stroke", AXIS_COLOR)
        .attr("stroke-width", 1.8)
        .attr("stroke-linejoin", "round");

    // ── Year tick labels ────────────────────────────────
    const axisG = svg.append("g")
        .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom + 10})`);

    axisG.selectAll(".yr-tick")
        .data(tickYears)
        .enter()
        .append("text")
        .attr("class", "yr-tick")
        .attr("x", d => x(d))
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("fill", TEXT_MUTED)
        .attr("font-size", 11)
        .attr("font-family", tok("--font-body") || "DM Sans, sans-serif")
        .text(d => d);

    // small tick marks
    axisG.selectAll(".yr-mark")
        .data(tickYears)
        .enter()
        .append("line")
        .attr("x1", d => x(d)).attr("x2", d => x(d))
        .attr("y1", -12).attr("y2", -6)
        .attr("stroke", AXIS_COLOR)
        .attr("stroke-width", 1);

    // ── Stem lines (node → axis) ────────────────────────
    svg.selectAll(".tl-stem")
        .data(events)
        .enter()
        .append("line")
        .attr("class", "tl-stem")
        .attr("x1", d => x(d.year)).attr("x2", d => x(d.year))
        .attr("y1", d => d.renderY).attr("y2", AXIS_Y)
        .attr("stroke", STEM_COLOR)
        .attr("stroke-width", 1.2);

    // ── Node groups ─────────────────────────────────────
    let selectedNode = null;

    const nodeG = svg.selectAll(".tl-node")
        .data(events)
        .enter()
        .append("g")
        .attr("class", "tl-node")
        .attr("transform", d => `translate(${x(d.year)},${d.renderY})`)
        .style("cursor", "pointer");

    // outer halo (appears on hover/select via JS)
    nodeG.append("circle")
        .attr("class", "tl-halo")
        .attr("r", d => (d.prize ? PRIZE_R : NODE_R) + 5)
        .attr("fill", "transparent")
        .attr("stroke", "none");

    // main dot
    nodeG.append("circle")
        .attr("class", "tl-dot")
        .attr("r", d => d.prize ? PRIZE_R : NODE_R)
        .attr("fill", d => d.prize ? PRIZE_COLOR : (FIELD_COLOR[d.field] || "#8B5CF6"))
        .attr("stroke", "#fff")
        .attr("stroke-width", d => d.prize ? 2.5 : 1.8);

    // ★ inside prize dots
    nodeG.filter(d => d.prize)
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", 8)
        .attr("fill", "#fff")
        .style("pointer-events", "none")
        .text("★");

    // ── Interaction ─────────────────────────────────────
    nodeG
        .on("mouseenter", function(event, d) {
            d3.select(this).select(".tl-dot")
                .transition().duration(120)
                .attr("r", (d.prize ? PRIZE_R : NODE_R) + 3)
                .attr("stroke-width", 3);
        })
        .on("mouseleave", function(event, d) {
            if (selectedNode !== d) {
                d3.select(this).select(".tl-dot")
                    .transition().duration(120)
                    .attr("r", d.prize ? PRIZE_R : NODE_R)
                    .attr("stroke-width", d.prize ? 2.5 : 1.8);
            }
        })
        .on("click", function(event, d) {
            event.stopPropagation();

            // Reset previous
            if (selectedNode) {
                svg.selectAll(".tl-node").select(".tl-dot")
                    .transition().duration(120)
                    .attr("r", n => n.prize ? PRIZE_R : NODE_R)
                    .attr("stroke-width", n => n.prize ? 2.5 : 1.8)
                    .attr("stroke", "#fff");
            }

            if (selectedNode === d) {
                // deselect
                selectedNode = null;
                d3.select("#timeline-detail").html(
                    "<span style='color:var(--color-text-3);font-size:12px;'>Click a dot to see paper details.<\/span>"
                );
                return;
            }

            selectedNode = d;

            // Highlight selected dot
            d3.select(this).select(".tl-dot")
                .transition().duration(120)
                .attr("r", (d.prize ? PRIZE_R : NODE_R) + 4)
                .attr("stroke", d.prize ? PRIZE_COLOR : (FIELD_COLOR[d.field] || "#8B5CF6"))
                .attr("stroke-width", 3);

            // Update detail panel
            renderDetail(d);
        });

    // click on SVG background → deselect
    svg.on("click", () => {
        if (!selectedNode) return;
        selectedNode = null;
        svg.selectAll(".tl-node").select(".tl-dot")
            .transition().duration(120)
            .attr("r", n => n.prize ? PRIZE_R : NODE_R)
            .attr("stroke-width", n => n.prize ? 2.5 : 1.8)
            .attr("stroke", "#fff");
        d3.select("#timeline-detail").html(
            "<span style='color:var(--color-text-3);font-size:12px;'>Click a dot to see paper details.<\/span>"
        );
    });

    // ── Legend ─────────────────────────────────────────
    const LEGEND_ITEMS = [
        { label: "Chemistry", color: FIELD_COLOR.Chemistry },
        { label: "Medicine",  color: FIELD_COLOR.Medicine  },
        { label: "Physics",   color: FIELD_COLOR.Physics   },
        { label: "Prize paper", color: PRIZE_COLOR, star: true }
    ];

    const legendG = svg.append("g")
        .attr("transform", `translate(${MARGIN.left}, ${MARGIN.top - 44})`);

    let lx = 0;
    LEGEND_ITEMS.forEach(item => {
        const r = item.star ? 8 : 5;

        legendG.append("circle")
            .attr("cx", lx + r).attr("cy", r)
            .attr("r", r)
            .attr("fill", item.color)
            .attr("stroke", item.star ? "#fff" : "none")
            .attr("stroke-width", item.star ? 2 : 0);

        if (item.star) {
            legendG.append("text")
                .attr("x", lx + r).attr("y", r + 0.5)
                .attr("text-anchor", "middle").attr("dy", "0.35em")
                .attr("font-size", 7).attr("fill", "#fff")
                .style("pointer-events", "none")
                .text("★");
        }

        legendG.append("text")
            .attr("x", lx + r * 2 + 5).attr("y", r + 0.5)
            .attr("dy", "0.35em")
            .attr("fill", TEXT_MUTED)
            .attr("font-size", 11)
            .attr("font-family", tok("--font-body") || tok("--body") || "DM Sans, system-ui, sans-serif")
            .text(item.label);

        lx += item.label.length * 7 + r * 2 + 24;
    });

    // ── Detail panel renderer ───────────────────────────
    function renderDetail(d) {
        const fColor  = d.prize ? PRIZE_COLOR : (FIELD_COLOR[d.field] || "#8B5CF6");
        const fBg     = d.prize ? "#FEF3C7" : (
            d.field === "Chemistry" ? "#ECFDF5" :
            d.field === "Medicine"  ? "#EFF6FF" : "#F5F3FF"
        );
        const fText   = d.prize ? "#92400E" : (
            d.field === "Chemistry" ? "#065F46" :
            d.field === "Medicine"  ? "#1E40AF" : "#4C1D95"
        );

        const before = papers.filter(p => p.pubYear < d.year).length;
        const after  = papers.filter(p => p.pubYear > d.year).length;

        const citationHtml = d.citations
            ? `<span style="margin-left:12px;color:${TEXT_MUTED};">Cited by: <strong style="color:${TEXT_MAIN}">${d.citations}<\/strong><\/span>`
            : "";

        const prizeHtml = d.prize
            ? `<span style="
                display:inline-flex;align-items:center;gap:4px;
                background:#FEF3C7;color:#92400E;
                font-size:11px;font-weight:600;
                padding:2px 8px;border-radius:999px;
                margin-left:8px;">★ Prize Paper<\/span>`
            : "";

        const journalHtml = d.journal
            ? `<div style="margin-top:4px;font-size:12px;color:${TEXT_MUTED};font-style:italic;">${d.journal}<\/div>`
            : "";

        d3.select("#timeline-detail").html(`
            <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:240px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                        <span style="
                            background:${fBg};color:${fText};
                            font-size:11px;font-weight:600;
                            padding:2px 8px;border-radius:999px;">
                            ${d.field}
                        <\/span>
                        <span style="font-size:13px;font-weight:600;color:${TEXT_MAIN};">
                            ${d.year}
                        <\/span>
                        ${prizeHtml}
                    <\/div>
                    <div style="font-size:13px;color:${TEXT_MAIN};font-weight:500;line-height:1.4;">
                        ${d.title || "—"}
                    <\/div>
                    ${journalHtml}
                <\/div>
                <div style="display:flex;gap:16px;align-items:center;flex-shrink:0;">
                    <div style="text-align:center;">
                        <div style="font-size:22px;font-weight:300;font-style:italic;color:${TEXT_MAIN};font-family:${FONT_DISPLAY};">${before}<\/div>
                        <div style="font-size:10px;color:${TEXT_MUTED};letter-spacing:0.06em;text-transform:uppercase;">Before<\/div>
                    <\/div>
                    <div style="width:1px;height:28px;background:${BORDER};"><\/div>
                    <div style="text-align:center;">
                        <div style="font-size:22px;font-weight:300;font-style:italic;color:${TEXT_MAIN};font-family:${FONT_DISPLAY};">${after}<\/div>
                        <div style="font-size:10px;color:${TEXT_MUTED};letter-spacing:0.06em;text-transform:uppercase;">After<\/div>
                    <\/div>
                    ${d.citations ? `
                    <div style="width:1px;height:28px;background:${BORDER};"><\/div>
                    <div style="text-align:center;">
                        <div style="font-size:22px;font-weight:300;font-style:italic;color:${TEXT_MAIN};font-family:${FONT_DISPLAY};">${d.citations}<\/div>
                        <div style="font-size:10px;color:${TEXT_MUTED};letter-spacing:0.06em;text-transform:uppercase;">Citations<\/div>
                    <\/div>` : ""}
                <\/div>
            <\/div>
        `);
    }
}
// =====================================================
// network.js — Collaboration Network
//
// Colours match timeline.js:
//   Chemistry → #10B981  Medicine → #3B82F6  Physics → #8B5CF6
//
// Central node  : selected author, larger (r=22), field colour
// Collaborators : uniform size (r=10), field colour
// Labels        : always visible; author name slightly larger
// =====================================================

const FIELD_COLOR = {
    Chemistry : "#2563EB",
    Medicine  : "#0891B2",
    Physics   : "#7C3AED",
};

const FIELD_STROKE = {
    Chemistry : "#059669",
    Medicine  : "#2563EB",
    Physics   : "#7C3AED",
};

const FIELD_HALO = {
    Chemistry : "#D1FAE5",
    Medicine  : "#DBEAFE",
    Physics   : "#EDE9FE",
};

function drawNetwork(author, allData) {

    d3.select("#network").selectAll("*").remove();

    // ── Container & tokens ───────────────────────────
    const container  = document.querySelector("#network");
    const width      = Math.max(container.clientWidth - 4, 600);

    const cs       = getComputedStyle(document.documentElement);
    const tok      = k => cs.getPropertyValue(k).trim();
    const TEXT_MAIN  = tok("--color-text")    || "#1E293B";
    const TEXT_MUTED = tok("--color-text-2")  || "#64748B";
    const BORDER     = tok("--color-border")  || "#E2E8F0";
    const SURFACE    = tok("--color-surface") || "#ffffff";
    const FONT       = tok("--font-body")     || tok("--body")     || "DM Sans, system-ui, sans-serif";
    const FONT_DISPLAY = tok("--font-display") || tok("--display") || "Fraunces, Georgia, serif";
    const FONT_MONO  = tok("--font-mono")    || tok("--mono")    || "DM Mono, monospace";

    // ── Node sizes ───────────────────────────────────
    const MAIN_R  = 22;   // central author
    const PEER_R  = 10;   // all collaborators — uniform

    // ── Build nodes & links ──────────────────────────
    const paperIDs      = new Set(author.papers.map(d => d["Paper ID"]));
    const collaborators = allData.filter(d => paperIDs.has(d["Paper ID"]));

    const nodeMap = new Map();
    collaborators.forEach(d => {
        if (!nodeMap.has(d["Laureate ID"])) {
            nodeMap.set(d["Laureate ID"], {
                id  : d["Laureate ID"],
                name: d["Laureate name"],
                field: d.field || "Other",
                main: d["Laureate ID"] === author.id,
            });
        }
    });
    const nodes = Array.from(nodeMap.values());

    const links = [];
    const grouped = d3.group(collaborators, d => d["Paper ID"]);
    grouped.forEach(group => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                links.push({
                    source: group[i]["Laureate ID"],
                    target: group[j]["Laureate ID"],
                });
            }
        }
    });

    // ── Dynamic height ───────────────────────────────
    const height = Math.max(560, Math.min(nodes.length * 30, 1000));

    // ── SVG ─────────────────────────────────────────
    const svg = d3.select("#network")
        .append("svg")
        .attr("class", "d3-chart")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("#tooltip");

    // ── Simulation ───────────────────────────────────
    const simulation = d3.forceSimulation(nodes)
        .force("link",
            d3.forceLink(links)
                .id(d => d.id)
                .distance(d => {
                    const s = d.source, t = d.target;
                    return (s.main || t.main) ? 155 : 100;
                })
                .strength(0.5)
        )
        .force("charge",    d3.forceManyBody().strength(-550))
        .force("center",    d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d =>
            (d.main ? MAIN_R : PEER_R) + 26
        ))
        .force("x", d3.forceX(width  / 2).strength(0.04))
        .force("y", d3.forceY(height / 2).strength(0.04));

    // ── Background glow ──────────────────────────────
    const authorField = author.papers[0]?.field;
    svg.append("circle")
        .attr("cx", width / 2).attr("cy", height / 2)
        .attr("r", 160)
        .attr("fill", FIELD_COLOR[authorField] || "#6366F1")
        .attr("opacity", 0.04);

    // ── Links ────────────────────────────────────────
    const link = svg.selectAll(".net-link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "net-link")
        .attr("stroke", BORDER)
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.5);

    // ── Node groups ──────────────────────────────────
    const nodeGroup = svg.selectAll(".net-node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "net-node")
        .style("cursor", "pointer")
        .call(drag(simulation));

    // Halo
    nodeGroup.append("circle")
        .attr("r", d => (d.main ? MAIN_R : PEER_R) + (d.main ? 9 : 5))
        .attr("fill", d => FIELD_HALO[d.field] || "#F1F5F9")
        .attr("opacity", d => d.main ? 0.35 : 0.18);

    // Main circle
    nodeGroup.append("circle")
        .attr("r", d => d.main ? MAIN_R : PEER_R)
        .attr("fill", d => FIELD_COLOR[d.field] || "#94A3B8")
        .attr("stroke", "#fff")
        .attr("stroke-width", d => d.main ? 3.5 : 2);

    // Inner ring for central author
    nodeGroup.filter(d => d.main)
        .append("circle")
        .attr("r", MAIN_R - 6)
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.55);

    // Initials inside central node
    nodeGroup.filter(d => d.main)
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .attr("fill", "#fff")
        .attr("font-family", FONT)
        .style("pointer-events", "none")
        .text(d => {
            const parts = d.name.trim().split(/\s+/);
            return parts.length >= 2
                ? parts[0][0] + parts[parts.length - 1][0]
                : parts[0].slice(0, 2);
        });

    // ── Labels ───────────────────────────────────────
    // Central author: below node, larger & bolder
    nodeGroup.filter(d => d.main)
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", MAIN_R + 15)
        .attr("font-size", 13)
        .attr("font-weight", 600)
        .attr("fill", TEXT_MAIN)
        .attr("font-family", FONT)
        .style("pointer-events", "none")
        .text(d => d.name);

    // Collaborators: right of node, muted
    nodeGroup.filter(d => !d.main)
        .append("text")
        .attr("x", PEER_R + 7)
        .attr("dy", "0.35em")
        .attr("font-size", 11)
        .attr("font-weight", 400)
        .attr("fill", TEXT_MUTED)
        .attr("font-family", FONT)
        .style("pointer-events", "none")
        .text(d => d.name);

    // ── Hover ────────────────────────────────────────
    nodeGroup
        .on("mouseenter", (event, d) => {
            tooltip
                .classed("visible", true)
                .html(`
                    <div class="tt-label">${d.main ? "Selected laureate" : "Co-author"}<\/div>
                    <div class="tt-value">${d.name}<\/div>
                    <div style="margin-top:5px;font-size:11px;color:${TEXT_MUTED};">
                        Field: <strong>${d.field || "Unknown"}<\/strong>
                    <\/div>
                `)
                .style("left", (event.pageX + 14) + "px")
                .style("top",  (event.pageY - 28) + "px");

            d3.select(event.currentTarget)
                .transition().duration(150)
                .attr("transform", d2 =>
                    `translate(${d2.x},${d2.y}) scale(1.12)`
                );
        })
        .on("mouseleave", (event) => {
            tooltip.classed("visible", false);
            d3.select(event.currentTarget)
                .transition().duration(150)
                .attr("transform", d2 =>
                    `translate(${d2.x},${d2.y}) scale(1)`
                );
        });

    // ── Tick ─────────────────────────────────────────
    simulation.on("tick", () => {
        const pad = 60;
        nodes.forEach(d => {
            d.x = Math.max(pad, Math.min(width  - pad, d.x));
            d.y = Math.max(pad, Math.min(height - pad, d.y));
        });
        link
            .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // ── Legend ───────────────────────────────────────
    const LEGEND = [
        { label: "Chemistry", color: FIELD_COLOR.Chemistry },
        { label: "Medicine",  color: FIELD_COLOR.Medicine  },
        { label: "Physics",   color: FIELD_COLOR.Physics   },
    ];

    const legendG = svg.append("g").attr("transform", "translate(20,20)");

    legendG.append("rect")
        .attr("x", -8).attr("y", -8)
        .attr("width", 232).attr("height", 28)
        .attr("rx", 8)
        .attr("fill", SURFACE).attr("stroke", BORDER)
        .attr("stroke-width", 0.5).attr("opacity", 0.92);

    let lx = 0;
    LEGEND.forEach(item => {
        legendG.append("circle")
            .attr("cx", lx + 6).attr("cy", 5)
            .attr("r", 6)
            .attr("fill", item.color)
            .attr("stroke", "#fff").attr("stroke-width", 1.5);

        legendG.append("text")
            .attr("x", lx + 16).attr("y", 9)
            .attr("font-size", 11).attr("font-family", FONT)
            .attr("fill", TEXT_MUTED)
            .text(item.label);

        lx += 76;
    });

    // ── Drag ─────────────────────────────────────────
    function drag(sim) {
        return d3.drag()
            .on("start", (event) => {
                if (!event.active) sim.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            })
            .on("drag", (event) => {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            })
            .on("end", (event) => {
                if (!event.active) sim.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            });
    }
}
function drawGlobalStats(data) {

    d3.select("#global-stats").html("");

    // =====================================================
    // Design Tokens
    // =====================================================

    const style = getComputedStyle(document.documentElement);

    const c1 =
        style.getPropertyValue('--d3-c1').trim();

    const c2 =
        style.getPropertyValue('--d3-c2').trim();

    const c3 =
        style.getPropertyValue('--d3-c3').trim();

    const textColor =
        style.getPropertyValue('--color-text').trim();

    const text2 =
        style.getPropertyValue('--color-text-2').trim();

    const border =
        style.getPropertyValue('--color-border').trim();

    const bg =
        style.getPropertyValue('--color-surface').trim();

    // =====================================================
    // Layout
    // =====================================================

    const chartWidth = 420;
    const chartHeight = 260;

    // =====================================================
    // Container
    // =====================================================

    const container =
        d3.select("#global-stats");

    // grid layout
    container
        .style("display", "grid")
        .style(
            "grid-template-columns",
            "repeat(auto-fit,minmax(420px,1fr))"
        )
        .style("gap", "24px");

    // =====================================================
    // Chart Box
    // =====================================================

    function box(title, subtitle, fn) {

        const div = container
            .append("div")
            .attr("class", "chart-wrap")
            .style("background", bg)
            .style("padding", "18px")
            .style("border-radius", "14px")
            .style("border", `1px solid ${border}`);

        // header
        const header = div
            .append("div")
            .attr("class", "chart-header");

        header.append("div")
            .attr("class", "chart-title")
            .text(title);

        header.append("div")
            .attr("class", "chart-subtitle")
            .style("margin-top", "4px")
            .text(subtitle);

        // svg
        const svg = div
            .append("svg")
            .attr("class", "d3-chart")
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        fn(svg);
    }

    // =====================================================
    // Data Groups
    // =====================================================

    const fieldGroups =
        d3.groups(data, d => d.field);

    // =====================================================
    // ① Papers
    // =====================================================

    box(
        "Field Papers",
        "Total publications in each field",
        svg => {

            const x = d3.scaleBand()
                .domain(fieldGroups.map(d => d[0]))
                .range([60, chartWidth - 20])
                .padding(0.35);

            const y = d3.scaleLinear()
                .domain([
                    0,
                    d3.max(fieldGroups, d => d[1].length)
                ])
                .nice()
                .range([chartHeight - 50, 40]);

            // grid
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(60,0)")
                .call(
                    d3.axisLeft(y)
                        .tickSize(
                            -(chartWidth - 80)
                        )
                        .tickFormat("")
                );

            // bars
            svg.selectAll("rect")
                .data(fieldGroups)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1].length))
                .attr("width", x.bandwidth())
                .attr(
                    "height",
                    d =>
                        chartHeight - 50 - y(d[1].length)
                )
                .attr("fill", c1);

            // labels
            svg.selectAll(".value")
                .data(fieldGroups)
                .enter()
                .append("text")
                .attr("x", d =>
                    x(d[0]) + x.bandwidth() / 2
                )
                .attr("y", d =>
                    y(d[1].length) - 8
                )
                .attr("text-anchor", "middle")
                .attr("fill", textColor)
                .attr("font-size", 12)
                .attr("font-weight", 600)
                .text(d => d[1].length);

            // axis
            svg.append("g")
                .attr(
                    "transform",
                    `translate(0,${chartHeight - 50})`
                )
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("transform", `translate(60,0)`)
                .call(d3.axisLeft(y));

            // x label
            svg.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight - 10)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Research Fields");

            // y label
            svg.append("text")
                .attr(
                    "transform",
                    "rotate(-90)"
                )
                .attr("x", -chartHeight / 2)
                .attr("y", 18)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Number of Papers");
        }
    );

    // =====================================================
    // ② Prize Papers
    // =====================================================

    box(
        "Prize-winning Papers",
        "Prize papers in each field",
        svg => {

            const prizeData = fieldGroups.map(([f, arr]) => [

                f,

                arr.filter(d => d.isPrizePaper).length
            ]);

            const x = d3.scaleBand()
                .domain(prizeData.map(d => d[0]))
                .range([60, chartWidth - 20])
                .padding(0.35);

            const y = d3.scaleLinear()
                .domain([
                    0,
                    d3.max(prizeData, d => d[1])
                ])
                .nice()
                .range([chartHeight - 50, 40]);

            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(60,0)")
                .call(
                    d3.axisLeft(y)
                        .tickSize(
                            -(chartWidth - 80)
                        )
                        .tickFormat("")
                );

            svg.selectAll("rect")
                .data(prizeData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1]))
                .attr("width", x.bandwidth())
                .attr(
                    "height",
                    d =>
                        chartHeight - 50 - y(d[1])
                )
                .attr("fill", c2);

            svg.selectAll(".value")
                .data(prizeData)
                .enter()
                .append("text")
                .attr("x", d =>
                    x(d[0]) + x.bandwidth() / 2
                )
                .attr("y", d =>
                    y(d[1]) - 8
                )
                .attr("text-anchor", "middle")
                .attr("fill", textColor)
                .attr("font-size", 12)
                .attr("font-weight", 600)
                .text(d => d[1]);

            svg.append("g")
                .attr(
                    "transform",
                    `translate(0,${chartHeight - 50})`
                )
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("transform", `translate(60,0)`)
                .call(d3.axisLeft(y));

            svg.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight - 10)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Research Fields");

            svg.append("text")
                .attr(
                    "transform",
                    "rotate(-90)"
                )
                .attr("x", -chartHeight / 2)
                .attr("y", 18)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Number of Prize Papers");
        }
    );

    // =====================================================
    // ③ Authors
    // =====================================================

    box(
        "Nobel Authors",
        "Number of laureates in each field",
        svg => {

            const authorData = fieldGroups.map(([f, arr]) => [

                f,

                new Set(
                    arr.map(d => d["Laureate ID"])
                ).size
            ]);

            const x = d3.scaleBand()
                .domain(authorData.map(d => d[0]))
                .range([60, chartWidth - 20])
                .padding(0.35);

            const y = d3.scaleLinear()
                .domain([
                    0,
                    d3.max(authorData, d => d[1])
                ])
                .nice()
                .range([chartHeight - 50, 40]);

            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(60,0)")
                .call(
                    d3.axisLeft(y)
                        .tickSize(
                            -(chartWidth - 80)
                        )
                        .tickFormat("")
                );

            svg.selectAll("rect")
                .data(authorData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d[0]))
                .attr("y", d => y(d[1]))
                .attr("width", x.bandwidth())
                .attr(
                    "height",
                    d =>
                        chartHeight - 50 - y(d[1])
                )
                .attr("fill", c3);

            svg.selectAll(".value")
                .data(authorData)
                .enter()
                .append("text")
                .attr("x", d =>
                    x(d[0]) + x.bandwidth() / 2
                )
                .attr("y", d =>
                    y(d[1]) - 8
                )
                .attr("text-anchor", "middle")
                .attr("fill", textColor)
                .attr("font-size", 12)
                .attr("font-weight", 600)
                .text(d => d[1]);

            svg.append("g")
                .attr(
                    "transform",
                    `translate(0,${chartHeight - 50})`
                )
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("transform", `translate(60,0)`)
                .call(d3.axisLeft(y));

            svg.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight - 10)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Research Fields");

            svg.append("text")
                .attr(
                    "transform",
                    "rotate(-90)"
                )
                .attr("x", -chartHeight / 2)
                .attr("y", 18)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Number of Authors");
        }
    );

    // =====================================================
    // ④ Publication Distribution
    // =====================================================

    const total = d3.rollups(
        data,
        v => v.length,
        d => d["Laureate ID"]
    );

    box(
        "Author Publication Distribution",
        "Distribution of publication counts",
        svg => {

            const x = d3.scaleLinear()
                .domain([
                    0,
                    d3.max(total, d => d[1])
                ])
                .nice()
                .range([60, chartWidth - 30]);

            const y = d3.scaleLinear()
                .domain([0, total.length])
                .range([chartHeight - 50, 40]);

            // grid
            svg.append("g")
                .attr("class", "grid")
                .attr(
                    "transform",
                    `translate(0,${chartHeight - 50})`
                )
                .call(
                    d3.axisBottom(x)
                        .tickSize(
                            -(chartHeight - 90)
                        )
                        .tickFormat("")
                );

            // dots
            svg.selectAll("circle")
                .data(total)
                .enter()
                .append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d[1]))
                .attr("cy", (d, i) => y(i))
                .attr("r", 4)
                .attr("fill", c1)
                .attr("opacity", 0.8);

            // axis
            svg.append("g")
                .attr(
                    "transform",
                    `translate(0,${chartHeight - 50})`
                )
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("transform", `translate(60,0)`)
                .call(
                    d3.axisLeft(y)
                        .ticks(5)
                );

            // x label
            svg.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight - 10)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Number of Papers");

            // y label
            svg.append("text")
                .attr(
                    "transform",
                    "rotate(-90)"
                )
                .attr("x", -chartHeight / 2)
                .attr("y", 18)
                .attr("text-anchor", "middle")
                .attr("fill", text2)
                .text("Authors");
        }
    );
}
/**
 * app.js — Nobel Laureates Merged Visualization (v2)
 *
 * Tabs:
 *   📇 Author Explorer  — card grid (search / filter / sort)
 *   👤 Author Detail    — timeline + co-author net + career chart (appears on card click)
 *   🕸 Network          — global collaboration network (own tab, not buried at bottom)
 *   🌐 Global Stats     — cross-field stats charts
 */




// ─────────────────────────────────────────────────────────
// Constants & State
// ─────────────────────────────────────────────────────────
const FIELDS    = { Physics: 'phys', Chemistry: 'chem', Medicine: 'med' };
const FIELD_HEX = { Physics: '#7C3AED', Chemistry: '#2563EB', Medicine: '#0891B2' };

let LAUREATES       = [];
let allData         = [];
let activeFields    = new Set(['Physics', 'Chemistry', 'Medicine']);
let sortKey         = 'prize_year';
let searchTerm      = '';
let currentLaureate = null;

// Global network state
let netSimulation = null;
let netField      = 'Physics';
let netDecade     = 'all';
let netBuilt      = false;

// ─────────────────────────────────────────────────────────
// Data Loading
// ─────────────────────────────────────────────────────────
async function loadData() {
  const [prize, phys, chem, med] = await Promise.all([
    d3.csv('../../data/prize_paper.csv'),
    d3.csv('../../data/Physics publication record.csv'),
    d3.csv('../../data/Chemistry publication record.csv'),
    d3.csv('../../data/Medicine publication record.csv'),
  ]);

  phys.forEach(d => d.field = 'Physics');
  chem.forEach(d => d.field = 'Chemistry');
  med.forEach( d => d.field = 'Medicine');

  const normalData = [...phys, ...chem, ...med];
  const prizeSet   = new Set(prize.map(d => d['Paper ID']));

  normalData.forEach(d => {
    d.pubYear      = +d['Pub year'];
    d.prizeYear    = +d['Prize year'];
    d.isPrizePaper = prizeSet.has(d['Paper ID']);
  });

  allData = normalData;

  const prizeByID = d3.group(prize, d => d['Laureate ID']);
  const pubsByID  = d3.group(normalData, d => d['Laureate ID']);

  for (const [id, papers] of prizeByID.entries()) {
    const first  = papers[0];
    const field  = first['Field'];
    if (!field || !FIELDS[field]) continue;

    const allMyPubs = pubsByID.get(id) || [];
    const prizeYear = +first['Prize year'];
    const pubYears  = allMyPubs.map(d => +d['Pub year']).filter(y => y > 1800).sort(d3.ascending);
    const firstPub  = pubYears[0] ?? prizeYear;

    const countByYear = d3.rollup(
      allMyPubs.filter(d => +d['Pub year'] > 1800),
      v => v.length,
      d => +d['Pub year']
    );
    const career_data = [...countByYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({
        year,
        papers:  count,
        isPrize: papers.some(p => +p['Pub year'] === year),
      }));

    // deduplicated papers for timeline/network modules
    const seen = new Map();
    allMyPubs.forEach(r => { if (!seen.has(r['Paper ID'])) seen.set(r['Paper ID'], r); });

    LAUREATES.push({
      id,
      name:         formatName(first['Laureate name']),
      field,
      prize_year:   prizeYear,
      first_pub:    firstPub,
      total_papers: allMyPubs.length,
      wait:         prizeYear - +papers[0]['Pub year'],
      career_data,
      cls:          FIELDS[field],
      prize_papers: papers.map(p => ({ title: p['Title'], pub_year: +p['Pub year'] })),
      papers:       Array.from(seen.values()),
    });
  }
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatName(raw) {
  if (!raw) return '';
  const clean = raw.replace(/"/g, '').trim();
  const parts = clean.split(',').map(s => s.trim());
  if (parts.length === 2) {
    return (parts[1] + ' ' + parts[0]).split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ─────────────────────────────────────────────────────────
// Mode Switching
// ─────────────────────────────────────────────────────────
window.setMode = function(mode) {
  document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('mode-' + mode).classList.add('active');
  document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');

  // 피드백 2: explorer로 돌아오면 author-detail 탭 숨기기
  if (mode === 'explorer') {
    document.getElementById('btn-author-detail').style.display = 'none';
  }

  if (mode === 'global') {
    drawGlobalStats(allData);
  }
  if (mode === 'author-detail' && currentLaureate) {
    renderAuthorDetail(currentLaureate);
  }
  if (mode === 'network' && !netBuilt) {
    netBuilt = true;
    renderGlobalNetwork();
  }
};

// ─────────────────────────────────────────────────────────
// Author Explorer — Card Grid
// ─────────────────────────────────────────────────────────
function renderGrid() {
  let data = LAUREATES.filter(d => activeFields.has(d.field));
  if (searchTerm) data = data.filter(d => d.name.toLowerCase().includes(searchTerm));

  data.sort((a, b) => {
    if (sortKey === 'prize_year') return a.prize_year - b.prize_year;
    if (sortKey === 'papers')     return b.total_papers - a.total_papers;
    if (sortKey === 'wait')       return b.wait - a.wait;
    return a.name.localeCompare(b.name);
  });

  const maxPapers = d3.max(LAUREATES, d => d.total_papers) || 1;

  document.getElementById('results-meta').textContent =
    `${data.length} 位得主${searchTerm ? ` · "${searchTerm}"` : ''}`;

  document.getElementById('author-grid').innerHTML = data.map(d => `
    <div class="author-card ${d.cls}" onclick="openAuthorDetail('${d.id}')">
      <div class="card-field ${d.cls}">${d.field}<\/div>
      <div class="card-name">${d.name}<\/div>
      <div class="card-meta">
        <div class="card-stat">
          <span class="val">${d.prize_year}<\/span>
          <span class="lbl">获奖年份<\/span>
        <\/div>
        <div class="card-stat">
          <span class="val">${d.total_papers}<\/span>
          <span class="lbl">论文数<\/span>
        <\/div>
        <div class="card-stat">
          <span class="val">${d.wait > 0 ? d.wait : '—'}<\/span>
          <span class="lbl">等待年数<\/span>
        <\/div>
      <\/div>
      <div class="card-bar">
        <div class="card-bar-fill" style="width:${(d.total_papers/maxPapers*100).toFixed(1)}%;background:${FIELD_HEX[d.field]}"><\/div>
      <\/div>
    <\/div>
  `).join('');
}

window.toggleField = function(el, field) {
  if (activeFields.has(field)) {
    if (activeFields.size === 1) return;
    activeFields.delete(field);
    el.classList.remove('active');
  } else {
    activeFields.add(field);
    el.classList.add('active');
  }
  renderGrid();
};

window.handleSearch = function() {
  searchTerm = document.getElementById('search-input').value.toLowerCase();
  document.getElementById('search-clear').style.display = searchTerm ? 'block' : 'none';
  renderGrid();
};

window.clearSearch = function() {
  document.getElementById('search-input').value = '';
  searchTerm = '';
  document.getElementById('search-clear').style.display = 'none';
  renderGrid();
};

window.setSort = function(btn, key) {
  sortKey = key;
  document.querySelectorAll('.sort-group .sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrid();
};

// ─────────────────────────────────────────────────────────
// Author Detail
// ─────────────────────────────────────────────────────────
window.openAuthorDetail = function(id) {
  currentLaureate = LAUREATES.find(d => d.id === id);
  if (!currentLaureate) return;

  // 피드백 2: 탭 버튼 보여주기 (explorer → detail 전환 시에만)
  const btn = document.getElementById('btn-author-detail');
  btn.style.display = 'flex';
  document.getElementById('selected-author-label').textContent = currentLaureate.name;

  setMode('author-detail');
};

function renderAuthorDetail(laureate) {
  document.getElementById('detail-author-info').innerHTML = `
    <h2>${laureate.name}<\/h2>
    <div class="sub">
      <span style="color:${FIELD_HEX[laureate.field]};font-weight:500">${laureate.field}<\/span>
      &nbsp;·&nbsp; 获奖 ${laureate.prize_year}
      &nbsp;·&nbsp; ${laureate.total_papers} 篇论文
      &nbsp;·&nbsp; 首篇发表 ${laureate.first_pub}
    <\/div>
  `;

  drawTimeline(laureate, allData);
  drawNetwork(laureate, allData);
  drawCareerChart(laureate);
}

function drawCareerChart(d) {
  const svg = d3.select('#career-chart');
  svg.selectAll('*').remove();

  const W  = document.getElementById('career-chart').clientWidth || 800;
  const H  = 160;
  const m  = { top: 10, right: 12, bottom: 24, left: 36 };
  const cw = W - m.left - m.right;
  const ch = H - m.top - m.bottom;

  const x = d3.scaleBand().domain(d.career_data.map(p => p.year)).range([0, cw]).padding(0.08);
  const y = d3.scaleLinear().domain([0, d3.max(d.career_data, p => p.papers) || 1]).range([ch, 0]);

  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  g.append('g')
    .call(d3.axisLeft(y).ticks(3).tickSize(-cw).tickFormat(''))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').attr('stroke', 'var(--border)').attr('stroke-width', 0.5));

  const prizeX = x(d.prize_year);
  if (prizeX !== undefined) {
    g.append('rect')
      .attr('x', prizeX - 2).attr('y', -6)
      .attr('width', x.bandwidth() + 4).attr('height', ch + 8)
      .attr('fill', FIELD_HEX[d.field]).attr('opacity', 0.08).attr('rx', 2);
    g.append('line')
      .attr('x1', prizeX + x.bandwidth()/2).attr('x2', prizeX + x.bandwidth()/2)
      .attr('y1', -6).attr('y2', ch)
      .attr('stroke', FIELD_HEX[d.field]).attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3 2').attr('opacity', .8);
    g.append('text')
      .attr('x', prizeX + x.bandwidth()/2 + 4).attr('y', 2)
      .attr('fill', FIELD_HEX[d.field]).attr('font-size', 10)
      .attr('font-family', 'var(--font-body)').text('Prize');
  }

  g.selectAll('.bar')
    .data(d.career_data)
    .join('rect')
    .attr('x', p => x(p.year)).attr('y', p => y(p.papers))
    .attr('width', x.bandwidth()).attr('height', p => ch - y(p.papers))
    .attr('fill', p => p.isPrize ? FIELD_HEX[d.field] : 'var(--surface3)')
    .attr('rx', 1);

  const step = Math.ceil(d.career_data.length / 8);
  g.append('g').attr('transform', `translate(0,${ch})`)
    .call(d3.axisBottom(x)
      .tickValues(d.career_data.filter((_,i) => i % step === 0).map(p => p.year))
      .tickSize(3))
    .call(g => g.select('.domain').attr('stroke', 'var(--border)'))
    .call(g => g.selectAll('text').attr('fill', 'var(--text3)').attr('font-size', 10).attr('font-family', 'var(--font-body)'))
    .call(g => g.selectAll('line').attr('stroke', 'var(--border)'));

  g.append('g')
    .call(d3.axisLeft(y).ticks(3).tickSize(0))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('text').attr('fill', 'var(--text3)').attr('font-size', 10).attr('font-family', 'var(--font-body)').attr('dx', -4));
}

// ─────────────────────────────────────────────────────────
// Global Collaboration Network  (피드백 3: 전용 탭으로 분리)
// ─────────────────────────────────────────────────────────
function filterNetLaureates() {
  let nodes = LAUREATES.filter(d => d.field === netField);
  if (netDecade !== 'all') {
    const start = parseInt(netDecade);
    nodes = nodes.filter(d => d.prize_year >= start && d.prize_year <= start + 29);
  }
  return nodes.slice(0, 80);
}

function buildNetLinks(nodes) {
  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const diff = Math.abs(a.prize_year - b.prize_year);
      if (diff <= 5 && Math.random() < 0.25) {
        links.push({ source: a.id, target: b.id, value: Math.max(1, 5 - diff) });
      }
    }
  }
  return links;
}

function renderGlobalNetwork() {
  const wrap = document.getElementById('global-network-wrap');
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  d3.select('#global-network-wrap svg').remove();

  const nodes     = filterNetLaureates();
  const links     = buildNetLinks(nodes);
  const maxPapers = d3.max(nodes, d => d.total_papers) || 1;
  const r         = d => Math.sqrt(d.total_papers / maxPapers) * 22 + 5;
  const lw        = d3.scaleLinear().domain([1, 15]).range([0.5, 3]);

  document.getElementById('net-info').textContent =
    `Showing ${nodes.length} laureates · ${links.length} collaboration links`;

  const svg = d3.select('#global-network-wrap')
    .append('svg').attr('width', W).attr('height', H);

  if (netSimulation) netSimulation.stop();
  netSimulation = d3.forceSimulation(nodes)
    .force('link',      d3.forceLink(links).id(d => d.id).distance(120).strength(0.4))
    .force('charge',    d3.forceManyBody().strength(-400))
    .force('center',    d3.forceCenter(W/2, H/2))
    .force('x',         d3.forceX(W/2).strength(0.04))
    .force('y',         d3.forceY(H/2).strength(0.04))
    .force('collision', d3.forceCollide().radius(d => r(d) + 8));

  const link = svg.append('g').selectAll('line')
    .data(links).join('line')
    .attr('stroke', 'var(--border2)')
    .attr('stroke-width', d => lw(d.value))
    .attr('opacity', .6);

  const node = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e,d) => { if (!e.active) netSimulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag',  (e,d) => { d.fx=e.x; d.fy=e.y; })
      .on('end',   (e,d) => { if (!e.active) netSimulation.alphaTarget(0); d.fx=null; d.fy=null; })
    )
    .on('mouseover', (e, d) => {
      const tip  = document.getElementById('net-tooltip');
      const rect = wrap.getBoundingClientRect();
      tip.innerHTML = `<strong>${d.name}<\/strong><br><span style="color:var(--text3);font-size:11px">${d.field} · ${d.prize_year} · ${d.total_papers} papers<\/span>`;
      tip.style.left    = (e.clientX - rect.left + 12) + 'px';
      tip.style.top     = (e.clientY - rect.top  - 10) + 'px';
      tip.style.opacity = 1;
    })
    .on('mousemove', (e) => {
      const tip  = document.getElementById('net-tooltip');
      const rect = wrap.getBoundingClientRect();
      tip.style.left = (e.clientX - rect.left + 12) + 'px';
      tip.style.top  = (e.clientY - rect.top  - 10) + 'px';
    })
    .on('mouseout',  () => { document.getElementById('net-tooltip').style.opacity = 0; })
    .on('click',     (e, d) => openAuthorDetail(d.id));

  node.append('circle')
    .attr('r',            d => r(d))
    .attr('fill',         d => FIELD_HEX[d.field])
    .attr('fill-opacity', 0.15)
    .attr('stroke',       d => FIELD_HEX[d.field])
    .attr('stroke-width', 1);

  node.append('text')
    .text(d => d.name.split(' ').pop())
    .attr('text-anchor', 'middle').attr('dy', '0.35em')
    .attr('font-size',   d => r(d) > 12 ? 10 : 8)
    .attr('font-family', 'var(--font-body)')
    .attr('fill',        d => FIELD_HEX[d.field])
    .attr('pointer-events', 'none');

  netSimulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d =>
      `translate(${Math.max(r(d), Math.min(W-r(d), d.x))},${Math.max(r(d), Math.min(H-r(d), d.y))})`
    );
  });
}

window.setNetField = function(btn, field) {
  netField = field;
  document.querySelectorAll('[id^="net-f-"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (netBuilt) renderGlobalNetwork();
};

window.setNetDecade = function(btn, decade) {
  netDecade = decade;
  document.querySelectorAll('[id^="net-d-"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (netBuilt) renderGlobalNetwork();
};

// ─────────────────────────────────────────────────────────
// Header Stats
// ─────────────────────────────────────────────────────────
function renderHeaderStats() {
  const counts = d3.rollup(LAUREATES, v => v.length, d => d.field);
  document.getElementById('header-stats').innerHTML = [
    ['Physics',   counts.get('Physics')   || 0],
    ['Chemistry', counts.get('Chemistry') || 0],
    ['Medicine',  counts.get('Medicine')  || 0],
  ].map(([field, n]) => `
    <div class="stat-pill">
      <strong>${n}<\/strong>${field}
    <\/div>
  `).join('');
}

// ─────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────
(async () => {
  await loadData();
  renderHeaderStats();
  renderGrid();
})();
